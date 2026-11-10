"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bug, Camera, FileText, Lightbulb, Loader2, MessageSquare, Paperclip, Send, Trash2, X } from "lucide-react";
import { api } from "../lib/api";
import { getToken } from "../lib/session";
import { useToast } from "./ToastProvider";

const HIDDEN_ON = ["/login", "/pdf"];
const MAX_WIDTH = 1920;
const MAX_SHOT_BYTES = 2 * 1024 * 1024; // keep the request well under the 5 MB API limit

type Kind = "bug" | "feature";
const KINDS: Record<Kind, { label: string; icon: typeof Bug; title: string; hint: string; placeholder: string; notesLabel: string; shotHint: string }> = {
  bug: {
    label: "Report a bug",
    icon: Bug,
    title: "Something not working?",
    hint: "Tell us what went wrong and we'll fix it.",
    notesLabel: "What happened?",
    placeholder: "e.g. I clicked 'Save quotation' and nothing happened. I expected it to save and show a success message.",
    shotHint: "Recommended: capture the screen where the problem is.",
  },
  feature: {
    label: "Request a feature",
    icon: Lightbulb,
    title: "Have an idea?",
    hint: "Tell us what would make SpaceIO better for you.",
    notesLabel: "What would you like to see?",
    placeholder: "e.g. I'd like to duplicate a quotation so I can reuse it for a similar client.",
    shotHint: "Optional: add a screenshot or sketch to explain your idea.",
  },
};
const MAX_FILE_BYTES = 2.5 * 1024 * 1024;
const FILE_ACCEPT = "image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx";

export default function FeedbackButton() {
  const pathname = usePathname();
  const toast = useToast();
  const [authed, setAuthed] = useState(false);
  const [open, setOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [sending, setSending] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [kind, setKind] = useState<Kind>("bug");
  const [file, setFile] = useState<File | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Re-check on navigation so the button appears right after login / vanishes after logout
  useEffect(() => {
    setAuthed(!!getToken());
  }, [pathname, open]);

  if (!authed || HIDDEN_ON.some((p) => pathname?.startsWith(p))) return null;

  const takeScreenshot = async () => {
    setCapturing(true);
    // Hide our own UI so it is not part of the capture
    if (rootRef.current) rootRef.current.style.visibility = "hidden";
    try {
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 80)));
      const html2canvas = (await import("html2canvas")).default;
      const full = await html2canvas(document.body, {
        useCORS: true,
        logging: false,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        x: window.scrollX,
        y: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
      });
      const ratio = Math.min(1, MAX_WIDTH / full.width);
      const out = document.createElement("canvas");
      out.width = Math.round(full.width * ratio);
      out.height = Math.round(full.height * ratio);
      const ctx = out.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(full, 0, 0, out.width, out.height);
      // Highest quality that still fits the size budget
      let data = "";
      for (const q of [0.92, 0.85, 0.75, 0.6]) {
        data = out.toDataURL("image/jpeg", q);
        if (data.length * 0.75 <= MAX_SHOT_BYTES) break;
      }
      setShot(data);
    } catch {
      toast.show("Couldn't capture the screen. You can still send notes.", "error");
    } finally {
      if (rootRef.current) rootRef.current.style.visibility = "visible";
      setCapturing(false);
    }
  };

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      toast.show("File is too large (max 2.5 MB).", "error");
      return;
    }
    setFile(f);
  };

  const readBase64 = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.onerror = () => reject(new Error("Could not read the file."));
      r.readAsDataURL(f);
    });

  const submit = async () => {
    setSending(true);
    const id = toast.show("Sending feedback...", "loading");
    try {
      const filePayload = file
        ? { name: file.name, content_type: file.type || "application/octet-stream", data: await readBase64(file) }
        : null;
      await api("/feedback", {
        method: "POST",
        body: JSON.stringify({
          kind,
          notes: notes.trim(),
          screenshot: shot,
          file: filePayload,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
        }),
      });
      toast.update(id, "Thanks! Your feedback was sent.", "success");
      setOpen(false);
      setShot(null);
      setFile(null);
      setNotes("");
    } catch (e) {
      toast.update(id, e instanceof Error ? e.message : "Could not send feedback.", "error");
    } finally {
      setSending(false);
    }
  };

  const k = KINDS[kind];
  const canSend = !sending && !capturing && (notes.trim().length > 0 || !!shot || !!file);

  return (
    <div ref={rootRef} data-html2canvas-ignore="true">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="fixed right-0 top-1/2 z-[9500] flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-xl bg-primary-600 px-2 py-4 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-700 print:hidden"
      >
        <MessageSquare size={16} />
        <span style={{ writingMode: "vertical-rl" }} className="tracking-wider">Feedback</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[9600] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{k.title}</h2>
                <p className="text-sm text-slate-500">{k.hint}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div role="tablist" className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {(Object.keys(KINDS) as Kind[]).map((key) => {
                const Icon = KINDS[key].icon;
                const active = kind === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setKind(key)}
                    className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition ${
                      active ? "bg-white text-primary-700 shadow" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Icon size={16} /> {KINDS[key].label}
                  </button>
                );
              })}
            </div>

            <label className="mb-1 block text-sm font-semibold text-slate-800" htmlFor="feedback-notes">1. {k.notesLabel}</label>
            <textarea
              id="feedback-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={5000}
              rows={4}
              placeholder={k.placeholder}
              className="mb-5 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-900 outline-none focus:border-primary-400"
            />

            <div className="mb-1 text-sm font-semibold text-slate-800">2. Add a screenshot <span className="font-normal text-slate-400">(optional)</span></div>
            <p className="mb-2 text-xs text-slate-500">{k.shotHint}</p>
            {shot ? (
              <div className="mb-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shot} alt="Screenshot preview" className="max-h-60 w-full rounded-xl border border-slate-200 bg-slate-50 object-contain" />
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={takeScreenshot} disabled={capturing} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    {capturing ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} Retake
                  </button>
                  <button type="button" onClick={() => setShot(null)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={takeScreenshot}
                disabled={capturing}
                className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-4 text-sm font-semibold text-slate-600 hover:border-primary-400 hover:text-primary-600"
              >
                {capturing ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                {capturing ? "Capturing..." : "Capture this page"}
              </button>
            )}

            <div className="mb-1 text-sm font-semibold text-slate-800">3. Attach a file <span className="font-normal text-slate-400">(optional)</span></div>
            <input ref={fileRef} type="file" accept={FILE_ACCEPT} onChange={pickFile} className="hidden" />
            {file ? (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <FileText size={16} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} aria-label="Remove file" className="text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Paperclip size={16} /> Choose file <span className="font-normal text-slate-400">(image, PDF, doc · max 2.5 MB)</span>
              </button>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!canSend}
                className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {kind === "bug" ? "Send bug report" : "Send request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
