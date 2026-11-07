"use client";

import React, { memo, useEffect, useRef, useState } from "react";

type Common = {
  value: string;
  onValueChange: (value: string) => void;
  /** ms to wait after the last keystroke before telling the parent. */
  delay?: number;
};

type InputProps = Common &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { multiline?: false };
type AreaProps = Common &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & { multiline: true };

/**
 * Text input that keeps keystrokes in its own state, so typing re-renders only this
 * component instead of the whole (large) parent page. The parent is notified after a
 * short pause, on blur, and on unmount, so it never misses the final value.
 */
function DebouncedInputImpl(props: InputProps | AreaProps) {
  const { value, onValueChange, delay = 200, multiline, ...rest } = props as Common & {
    multiline?: boolean;
  } & Record<string, unknown>;

  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);
  const latestCb = useRef(onValueChange);
  latestCb.current = onValueChange;

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pending.current !== null) {
      const v = pending.current;
      pending.current = null;
      latestCb.current(v);
    }
  };

  // Accept external changes (clear button, loading a saved quotation) when nothing is pending.
  useEffect(() => {
    if (pending.current === null) setLocal(value);
  }, [value]);

  // Don't lose the last keystrokes if the component unmounts mid-debounce.
  useEffect(() => flush, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = e.target.value;
    setLocal(next);
    pending.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement & HTMLTextAreaElement>) => {
    flush();
    (rest.onBlur as ((ev: typeof e) => void) | undefined)?.(e);
  };

  if (multiline) {
    return (
      <textarea
        {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        value={local}
        onChange={handleChange}
        onBlur={onBlur}
      />
    );
  }
  return (
    <input
      {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
      value={local}
      onChange={handleChange}
      onBlur={onBlur}
    />
  );
}

const DebouncedInput = memo(DebouncedInputImpl) as typeof DebouncedInputImpl;
export default DebouncedInput;
