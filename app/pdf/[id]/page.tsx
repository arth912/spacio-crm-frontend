"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import SpaceLoader from '../../components/SpaceLoader';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export default function PDFViewerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchPDF = async () => {
      try {
        const token = localStorage.getItem("decocrm_auth_token");
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        const res = await fetch(`${API_BASE_URL}/quotations/${id}/pdf`, {
          headers
        });

        if (!res.ok) {
          let errMsg = "Failed to load quotation PDF.";
          try {
            const errData = await res.json();
            if (errData.detail) errMsg = errData.detail;
          } catch(e) {
            try {
              const errText = await res.text();
              if (errText) errMsg = errText;
            } catch(ex) {}
          }
          throw new Error(errMsg);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err: any) {
        console.error("PDF fetch error:", err);
        setError(err.message || "Failed to fetch PDF. The backend server might be offline.");
      }
    };

    fetchPDF();
  }, [id]);

  if (error) {
    throw new Error(error);
  }

  if (!pdfUrl) {
    return <SpaceLoader loading={true} text="Generating SpaceIO PDF Document..." />;
  }

  return (
    <div className="w-screen h-screen bg-slate-900 overflow-hidden flex flex-col">
      <div className="bg-slate-950 border-b border-white/5 py-3 px-6 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all group"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/spaceio_logo.png" alt="SpaceIO Logo" className="h-6 object-contain" />
            <span className="text-white text-xs font-black tracking-wider uppercase hidden sm:inline-block border-l border-white/10 pl-2">Proposal Viewer</span>
          </div>
        </div>
        <button
          onClick={() => {
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `proposal_${id}.pdf`;
            link.click();
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-1.5 rounded-xl text-xs shadow-sm transition-all flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download PDF</span>
        </button>
      </div>
      <iframe src={pdfUrl} className="w-full flex-1 border-none" title="SpaceIO Proposal PDF" />
    </div>
  );
}
