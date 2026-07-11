"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Result = { ok: boolean; error?: string };

type Props = {
  confirmMessage: string;
  onConfirm: () => Promise<Result>;
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  successMessage?: string;
};

export default function ConfirmButton({
  confirmMessage,
  onConfirm,
  children,
  className,
  pendingLabel,
  successMessage,
}: Props) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const router = useRouter();

  async function handleClick() {
    if (typeof window !== "undefined" && !window.confirm(confirmMessage)) return;
    setPending(true);
    setFeedback(null);
    const result = await onConfirm();
    setPending(false);

    if (result.ok) {
      setFeedback({ type: "success", message: successMessage ?? "✅ Berhasil dihapus." });
      setTimeout(() => router.refresh(), 700);
    } else {
      setFeedback({ type: "error", message: result.error ?? "Terjadi kesalahan. Coba lagi." });
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={
          className ??
          "text-bimbi-pink-dark hover:underline text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        }
      >
        {pending ? pendingLabel ?? "Menghapus..." : children}
      </button>
      {feedback && (
        <span
          className={`text-xs font-semibold ${feedback.type === "success" ? "text-emerald-600" : "text-bimbi-pink-dark"}`}
        >
          {feedback.message}
        </span>
      )}
    </div>
  );
}
