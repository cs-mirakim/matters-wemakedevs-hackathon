"use client";

import React, { useState, useEffect } from "react";
import { X, Edit3, Trash2, AlertTriangle, FolderGit2 } from "lucide-react";
import { cleanProjectName } from "@/lib/projects";

interface ManageProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: { id: string; name: string } | null;
  onUpdateProject: (id: string, newName: string) => void;
  onDeleteProject: (id: string) => void;
}

export default function ManageProjectModal({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  onDeleteProject,
}: ManageProjectModalProps) {
  const [name, setName] = useState(
    cleanProjectName(project?.name) || cleanProjectName(project?.id) || ""
  );
  const [mode, setMode] = useState<"edit" | "delete">("edit");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (project?.name || project?.id) {
      setName(cleanProjectName(project.name) || cleanProjectName(project.id));
    } else {
      setName("");
    }
    setError(null);
    setMode("edit");
  }, [project, isOpen]);

  if (!isOpen || !project || project.id === "all") return null;

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cleanProjectName(name);
    if (!clean) {
      setError("Nama projek tidak boleh dibiarkan kosong.");
      return;
    }
    onUpdateProject(cleanProjectName(project.id) || project.id, clean);
    onClose();
  };

  const handleConfirmDelete = () => {
    const cleanId = cleanProjectName(project.id) || cleanProjectName(project.name);
    onDeleteProject(cleanId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-[16px] border border-border max-w-md w-full p-6 shadow-xl relative animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-muted hover:text-foreground rounded-full hover:bg-subtle transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-3 mb-4">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12.5px] font-medium transition ${
              mode === "edit"
                ? "bg-primary text-white"
                : "text-muted hover:text-foreground hover:bg-subtle"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Rename Project</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("delete")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12.5px] font-medium transition ${
              mode === "delete"
                ? "bg-red-50 text-red-600 border border-red-200"
                : "text-muted hover:text-red-600 hover:bg-red-50"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Project</span>
          </button>
        </div>

        {mode === "edit" ? (
          <form onSubmit={handleSaveName} className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-foreground mb-1">
                Project Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                className="w-full px-3 py-2 text-[13px] bg-white border border-border rounded-[8px] focus:outline-none focus:border-primary"
                placeholder="e.g. Landing Page, Agent Memory Core"
                autoFocus
              />
              {error && <p className="text-[11.5px] text-red-600 mt-1">{error}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-[12px] font-medium text-foreground bg-white hover:bg-subtle border border-border rounded-[8px] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-[12px] font-medium text-white bg-primary hover:bg-primary-hover rounded-[8px] transition shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-[10px] flex items-start gap-2.5 text-[12px] text-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">Are you sure you want to delete this project?</p>
                <p className="mt-1">
                  Project <strong>{project.name}</strong> and all commitments attached to it will be removed from the active FalkorDB graph visualizer.
                </p>
              </div>
            </div>

            {/* Bi-Temporal Ownership Rules */}
            <div className="p-3 rounded-[10px] bg-blue-50/60 border border-blue-200 text-[11.5px] text-blue-900 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5 text-blue-950">
                <FolderGit2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Bi-Temporal Graph Cascade Principle:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-blue-800">
                • <strong>Invited Collaborators:</strong> Commitments under this project will be detached from active views. However, individual person profile nodes remain safe in the graph container.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-[12px] font-medium text-foreground bg-white hover:bg-subtle border border-border rounded-[8px] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-medium text-white bg-red-600 hover:bg-red-700 rounded-[8px] transition shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Project & Nodes</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
