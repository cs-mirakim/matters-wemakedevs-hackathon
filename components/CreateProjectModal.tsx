"use client";

import React, { useState } from "react";
import { X, FolderPlus, Sparkles } from "lucide-react";

import { cleanProjectName, formatProjectDisplay } from "@/lib/projects";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: { id: string; name: string; description: string }) => void;
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onCreateProject,
}: CreateProjectModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cleanProjectName(name);
    if (!clean) return;

    setIsSubmitting(true);
    onCreateProject({
      id: clean,
      name: formatProjectDisplay(clean),
      description: description.trim() || "Isolated project container in FalkorDB",
    });

    setName("");
    setDescription("");
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-[480px] bg-white rounded-[12px] border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-[#F8F9FA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-primary-soft text-primary flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-foreground tracking-tight">
                Create New Project
              </h3>
              <p className="text-[11.5px] text-muted">
                Each project receives isolated bi-temporal memory graph scopes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-muted hover:text-foreground p-1.5 rounded-[6px] hover:bg-subtle transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-foreground mb-1">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Client Landing Page, E-Commerce Platform, FYP Chatbot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-[13px] rounded-[8px] border border-border bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-foreground mb-1">
              Description / Objective (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. High-converting client landing page delivery with 2-week timeline and milestone reviews."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-[12.5px] rounded-[8px] border border-border bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition resize-none"
            />
          </div>

          {/* Quick Explanation */}
          <div className="p-3 rounded-[8px] bg-subtle border border-border text-[11.5px] text-muted space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>How it works in FalkorDB:</span>
            </div>
            <p>
              This project is stored under your Workspace tenant. Invited teammates and autonomous agents will collaborate with graph isolation scoped exclusively to this project.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-[12px] font-medium text-muted hover:text-foreground hover:bg-subtle rounded-[8px] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-4 py-2 text-[12.5px] font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-[8px] transition shadow-sm"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
