"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center text-[#0d0d0d] p-8 text-center relative overflow-hidden">
      <AlertTriangle className="w-16 h-16 text-[#C0392B] mb-6" />
      <h2 className="text-3xl font-medium tracking-[-0.02em] text-[#0d0d0d] mb-4" style={{ fontFamily: "var(--font-geist)" }}>
        Critical failure
      </h2>
      <p className="text-[16px] text-black/50 mb-8 max-w-lg leading-relaxed">
        The memory fragment is corrupted or the connection was lost. We couldn't reconstruct what happened.
      </p>

      <div className="bg-white border border-[#C0392B]/25 p-4 text-left text-sm font-mono text-[#C0392B] mb-8 rounded-lg max-w-2xl w-full overflow-auto max-h-48 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        {error.message || "Unknown error occurred"}
      </div>

      <button
        onClick={reset}
        className="rounded-full bg-[linear-gradient(143deg,#1c1c1c_1%,#353535_53%,#1c1c1c_100%)] text-white px-6 py-3 text-[15px] font-medium shadow-[0_2px_4px_-1px_rgba(13,13,13,0.5),0_0_0_1px_black] transition-opacity hover:opacity-90"
      >
        Reboot system
      </button>
    </div>
  );
}
