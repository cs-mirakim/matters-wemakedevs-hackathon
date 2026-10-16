"use client";

import React, { useEffect } from "react";
import { LogOut, X, AlertTriangle } from "lucide-react";

interface SignOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userEmail?: string | null;
}

export default function SignOutModal({
  isOpen,
  onClose,
  onConfirm,
  userEmail,
}: SignOutModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-md rounded-[16px] border border-border shadow-xl p-6 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-[8px] text-muted hover:text-foreground hover:bg-subtle transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Heading */}
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
            <LogOut className="w-5 h-5 ml-0.5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-[16px] font-semibold text-foreground tracking-tight">
              Sign out of Matters?
            </h3>
            <p className="text-[12.5px] text-muted leading-relaxed">
              You are currently signed in as{" "}
              <span className="font-semibold text-foreground font-mono">
                {userEmail || "current user"}
              </span>
              . Your FalkorDB graph state and memories will remain safely stored in the cloud.
            </p>
          </div>
        </div>

        {/* Confirmation Details Card */}
        <div className="mt-4 p-3 rounded-[10px] bg-subtle/80 border border-border text-[11.5px] text-muted space-y-1.5">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Workspace Session</span>
          </div>
          <p className="leading-relaxed">
            Signing out will disconnect your active tenant session. You can sign back in anytime with Google to resume accessing your live graph container.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[12.5px] font-medium text-foreground bg-white hover:bg-subtle border border-border rounded-[8px] transition active:scale-[0.99] shadow-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-[8px] transition active:scale-[0.99] shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Confirm Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
