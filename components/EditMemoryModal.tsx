"use client";

import React, { useState } from "react";
import { X, Save, Edit3, Calendar, FolderGit2, User, RefreshCw, AlertCircle } from "lucide-react";
import { cleanProjectName, isAllProject } from "@/lib/projects";

interface EditMemoryModalProps {
  isOpen: boolean;
  memory: any;
  projects?: { id: string; name: string }[];
  currentUser?: any;
  asOfDate?: string;
  workspaceOwner?: string | null;
  userRole?: string;
  onClose: () => void;
  onSaved: (updatedMemory: any) => void;
}

export default function EditMemoryModal({
  isOpen,
  memory,
  projects = [],
  currentUser = null,
  asOfDate,
  workspaceOwner = null,
  userRole = "admin",
  onClose,
  onSaved,
}: EditMemoryModalProps) {
  if (!isOpen || !memory) return null;

  const [text, setText] = useState<string>(memory.text || "");
  const [personName, setPersonName] = useState<string>(memory.personName || "Collaborator");
  const [project, setProject] = useState<string>(
    cleanProjectName(memory.project) || "General"
  );
  const [validFrom, setValidFrom] = useState<string>(
    memory.validFrom ? String(memory.validFrom).substring(0, 10) : new Date().toISOString().split("T")[0]
  );
  const [validTo, setValidTo] = useState<string>(
    memory.validTo ? String(memory.validTo).substring(0, 10) : ""
  );
  const [amount, setAmount] = useState<string>(
    memory.amount !== null && memory.amount !== undefined ? String(memory.amount) : ""
  );
  const [status, setStatus] = useState<"current" | "superseded">(
    memory.status === "superseded" ? "superseded" : "current"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const availableProjects = React.useMemo(() => {
    const list = projects
      .map((p) => cleanProjectName(p.name))
      .filter((p) => p && !isAllProject(p));
    const set = new Set(list);
    if (project && project !== "General") {
      set.add(cleanProjectName(project));
    }
    if (set.size === 0) set.add("General");
    return Array.from(set);
  }, [projects, project]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSaving) return;

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (!currentUser) {
        headers["x-guest-mode"] = "true";
      } else {
        try {
          const { auth } = await import("@/lib/firebase");
          if (auth.currentUser) {
            const token = await auth.currentUser.getIdToken();
            headers["Authorization"] = `Bearer ${token}`;
          } else {
            headers["Authorization"] = `Bearer ${currentUser.uid}`;
          }
        } catch {
          headers["Authorization"] = `Bearer ${currentUser.uid}`;
        }
      }

      if (workspaceOwner) {
        headers["x-workspace-owner"] = workspaceOwner;
      }
      if (userRole) {
        headers["x-user-role"] = userRole;
      }

      const payload = {
        sourceId: memory.sourceId || `mem_${Date.now()}`,
        text: text.trim(),
        personName: personName.trim(),
        project: project.trim(),
        validFrom,
        validTo: status === "current" ? null : (validTo.trim() ? validTo : null),
        amount: amount.trim() ? parseFloat(amount) : null,
        status,
      };

      const res = await fetch("/api/capture", {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update memory.");
      }

      // If in guest mode, update guest memory in localStorage
      if (!currentUser || json.dbStatus === "guest_sandbox") {
        try {
          const guestMemories = JSON.parse(localStorage.getItem("matters_guest_memories") || "[]");
          const idx = guestMemories.findIndex((m: any) => m.sourceId === payload.sourceId);
          if (idx >= 0) {
            guestMemories[idx] = { ...guestMemories[idx], ...payload };
          } else {
            guestMemories.push(payload);
          }
          localStorage.setItem("matters_guest_memories", JSON.stringify(guestMemories));
        } catch {}
      }

      onSaved(payload);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save edits.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-[14px] border border-border shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-[#FAFAFA]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[8px] bg-primary-soft text-primary flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-foreground">Edit Memory Node</h3>
              <p className="text-[11px] text-muted">Modify statement, person, project, or temporal validity</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground p-1 rounded-md transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-3.5 text-[12px]">
          {errorMsg && (
            <div className="p-2.5 rounded-[8px] bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
              Instruction / Commitment Statement
            </label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-2.5 rounded-[8px] border border-border bg-white text-[12.5px] text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition resize-none leading-relaxed"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-muted" />
                  <span>Person Name</span>
                </span>
              </label>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-[6px] border border-border bg-white text-[12px] text-foreground focus:outline-none focus:border-primary font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                <span className="flex items-center gap-1">
                  <FolderGit2 className="w-3 h-3 text-muted" />
                  <span>Target Project</span>
                </span>
              </label>
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-[6px] border border-border bg-white text-[12px] text-foreground focus:outline-none focus:border-primary font-semibold"
              >
                {availableProjects.map((p) => {
                  const clean = cleanProjectName(p);
                  return (
                    <option key={clean} value={clean}>
                      📁 {clean}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-muted" />
                  <span>Valid From (Effective)</span>
                </span>
              </label>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-[6px] border border-border bg-white text-[12px] font-mono"
                required
              />
              {asOfDate && validFrom > asOfDate ? (
                <div className="mt-1 flex items-center justify-between text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  <span>Starts after timeline ({asOfDate})</span>
                  <button
                    type="button"
                    onClick={() => setValidFrom(asOfDate)}
                    className="font-bold underline hover:text-amber-900 cursor-pointer ml-1"
                  >
                    Make Active Now
                  </button>
                </div>
              ) : (
                <div className="mt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setValidFrom(new Date().toISOString().split("T")[0])}
                    className="text-[10px] text-primary hover:underline cursor-pointer"
                  >
                    Set Today ({new Date().toISOString().split("T")[0]})
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                <span>Valid To (Optional)</span>
              </label>
              <input
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                placeholder="Leave blank if active"
                className="w-full px-2.5 py-1.5 rounded-[6px] border border-border bg-white text-[12px] font-mono"
              />
              <span className="text-[10px] text-muted block mt-1">
                {status === "current" ? "Leave blank for active status" : "End date of this commitment"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                Amount / Quantity (Optional)
              </label>
              <input
                type="number"
                value={amount}
                placeholder="e.g. 3"
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-[6px] border border-border bg-white text-[12px] font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted uppercase tracking-wider mb-1">
                Memory Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  const newStatus = e.target.value as "current" | "superseded";
                  setStatus(newStatus);
                  if (newStatus === "current") {
                    setValidTo("");
                    // If it was future relative to timeline date, bring it to timeline date so it's active immediately
                    if (asOfDate && validFrom > asOfDate) {
                      setValidFrom(asOfDate);
                    }
                  } else if (newStatus === "superseded") {
                    if (!validTo) {
                      setValidTo(asOfDate || new Date().toISOString().split("T")[0]);
                    }
                  }
                }}
                className="w-full px-2.5 py-1.5 rounded-[6px] border border-border bg-white text-[12px] font-semibold"
              >
                <option value="current">Current (Active Immediately)</option>
                <option value="superseded">Superseded (Replaced / Archived)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-[6px] border border-border bg-subtle hover:bg-subtle/80 text-foreground text-[12px] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] bg-primary hover:bg-primary-hover text-white text-[12px] font-medium transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Memory</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
