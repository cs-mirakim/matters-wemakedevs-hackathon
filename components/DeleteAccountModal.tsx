"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  userEmail?: string;
  graphName?: string;
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  userEmail,
  graphName = "matters_user",
}: DeleteAccountModalProps) {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProceedDelete = async () => {
    if (confirmationInput !== "DELETE") {
      setError("Please type 'DELETE' to confirm deletion.");
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err: any) {
      setError(err?.message || "Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-[16px] border border-red-200 max-w-md w-full p-6 shadow-xl relative animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-1 text-muted hover:text-foreground rounded-full hover:bg-subtle transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-11 h-11 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <AlertTriangle className="w-5 h-5" />
        </div>

        <h3 className="text-[17px] font-bold text-foreground">
          Delete Account & FalkorDB Graph?
        </h3>
        <p className="text-[12.5px] text-muted mt-1.5 leading-relaxed">
          This action is <strong className="text-red-600 font-semibold">permanent</strong>. Your FalkorDB Cloud graph container (<code className="font-mono text-[11px] bg-red-50 text-red-700 px-1 py-0.5 rounded border border-red-200">{graphName}</code>), all commitments, projects, and registration records will be permanently purged.
        </p>

        <div className="mt-4 p-3 bg-red-50/70 border border-red-200 rounded-[10px] text-[12px] text-red-900">
          <p className="font-medium">
            To confirm, please type <span className="font-mono font-bold select-all bg-white px-1.5 py-0.5 rounded border border-red-300">DELETE</span> below:
          </p>
          <input
            type="text"
            value={confirmationInput}
            onChange={(e) => {
              setConfirmationInput(e.target.value);
              setError(null);
            }}
            placeholder="Type DELETE here"
            className="mt-2 w-full px-3 py-1.5 text-[13px] bg-white border border-red-300 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
            autoFocus
          />
        </div>

        {error && (
          <p className="text-[12px] text-red-600 font-medium mt-2">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-[12.5px] font-medium text-foreground bg-white hover:bg-subtle border border-border rounded-[8px] transition active:scale-[0.99]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProceedDelete}
            disabled={confirmationInput !== "DELETE" || isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-[8px] transition active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? "Deleting..." : "Permanently Delete Account"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
