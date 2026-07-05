"use client";

import { useState } from "react";
import { Brain, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { GraphNode } from "./EvidenceBoard";

type Props = {
  onMemify: () => void;
  onForget: () => void;
  selectedNode?: GraphNode | null;
};

export default function MemoryControls({ onMemify, onForget, selectedNode }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleForgetClick = () => {
    if (showConfirm) {
      onForget();
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
    }
  };

  return (
    <div className="absolute bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
      {/* Memify Toggle */}
      <button
        onClick={onMemify}
        className="flex items-center gap-2 rounded-full bg-[linear-gradient(143deg,#1c1c1c_1%,#353535_53%,#1c1c1c_100%)] px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_2px_4px_-1px_rgba(13,13,13,0.5),0_0_0_1px_black] transition-opacity hover:opacity-90"
      >
        <Brain className="size-4" />
        Improve memory
      </button>

      {/* Forget Button */}
      <div className="relative">
        <AnimatePresence>
          {showConfirm && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute bottom-full mb-2 right-0 bg-white text-[#0d0d0d] p-3 rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] text-sm w-48 border border-[#C0392B]/30"
            >
              Mr. Chow will make this disappear. There's no going back. You sure?
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleForgetClick}
          onMouseLeave={() => setShowConfirm(false)}
          className={`flex items-center gap-2 px-4 py-2.5 transition-all rounded-full text-[13px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.04)] border ${
            showConfirm
              ? "bg-[#C0392B] text-white border-[#C0392B] animate-pulse"
              : "bg-white border-black/[0.08] text-[#C0392B] hover:bg-[#C0392B]/5"
          }`}
        >
          <Trash2 className="size-4" />
          {selectedNode ? `Forget: ${selectedNode.label}` : "Mr. Chow says forget (clear all)"}
        </button>
      </div>
    </div>
  );
}
