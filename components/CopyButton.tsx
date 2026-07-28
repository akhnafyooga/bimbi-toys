"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-full bg-bimbi-mint px-3 py-1 text-xs font-bold text-white btn-press"
    >
      {copied ? "Tersalin! ✓" : "Salin"}
    </button>
  );
}
