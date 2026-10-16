"use client";

import React from "react";
import { LogOut, X } from "lucide-react";

interface ExitSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ExitSandboxModal({
  isOpen,
  onClose,
  onConfirm,
}: ExitSandboxModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-[16px] border border-border max-w-sm w-full p-5 shadow-xl relative animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-muted hover:text-foreground rounded-full hover:bg-subtle transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
          <LogOut className="w-5 h-5" />
        </div>

        <h3 className="text-[16px] font-bold text-foreground">
          Exit Sandbox Mode?
        </h3>
        <p className="text-[12.5px] text-muted mt-1 leading-relaxed">
          All temporary sandbox edits and local additions will reset to default demo baselines. You will be redirected to the sign in page.
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-[12px] font-medium text-foreground bg-white hover:bg-subtle border border-border rounded-[8px] transition active:scale-[0.99]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-[8px] transition active:scale-[0.99] shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Sandbox</span>
          </button>
        </div>
      </div>
    </div>
  );
}
