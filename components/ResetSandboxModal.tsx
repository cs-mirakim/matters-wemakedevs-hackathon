"use client";

import React from "react";
import { RotateCcw, X } from "lucide-react";

interface ResetSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ResetSandboxModal({
  isOpen,
  onClose,
  onConfirm,
}: ResetSandboxModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-[16px] border border-border max-w-sm w-full p-5 shadow-xl relative animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-muted hover:text-foreground rounded-full hover:bg-subtle transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-3">
          <RotateCcw className="w-5 h-5 text-red-600" />
        </div>

        <h3 className="text-[16px] font-bold text-foreground">
          Reset Demo Sandbox?
        </h3>
        <p className="text-[12.5px] text-muted mt-1 leading-relaxed">
          This will clear all simulated teammates (e.g. Dr. Sofia), temporary memories, and project modifications, restoring the sandbox to its initial 4-persona baseline.
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-[12px] font-medium text-foreground bg-white hover:bg-subtle border border-border rounded-[8px] transition active:scale-[0.99] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-[8px] transition active:scale-[0.99] shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Confirm Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}
