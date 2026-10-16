"use client";

import React, { useState } from "react";
import { X, UserPlus, Check, Copy, Shield, Users, Mail, FolderGit2 } from "lucide-react";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName?: string;
  graphName?: string;
  projects?: Array<{ id: string; name: string }>;
  selectedProject?: string;
  onInviteMember?: (member: { name: string; email: string; role: string; projectId: string }) => void;
}

export default function InviteModal({
  isOpen,
  onClose,
  workspaceName = "Workspace",
  graphName = "matters_live_user",
  projects = [
    { id: "all", name: "🌐 All Projects in Workspace" },
    { id: "studio", name: "📁 Innovation Studio Portal" },
  ],
  selectedProject = "all",
  onInviteMember,
}: InviteModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [assignedProject, setAssignedProject] = useState(selectedProject || "all");
  const [copied, setCopied] = useState(false);
  const [invitedList, setInvitedList] = useState<Array<{ name: string; email: string; role: string; project: string }>>([
    { name: "You (Owner)", email: "owner@workspace.local", role: "admin", project: "All Projects" }
  ]);
  const [justInvitedSuccess, setJustInvitedSuccess] = useState(false);

  if (!isOpen) return null;

  const inviteLink = `https://matters.ai/join?workspace=${graphName}&project=${assignedProject}&token=inv_${Math.random().toString(36).substring(2, 8)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const memberName = name.trim() || email.split("@")[0];
    const targetProjectName = projects.find((p) => p.id === assignedProject)?.name || "All Projects";

    setInvitedList((prev) => [
      ...prev,
      { name: memberName, email, role, project: targetProjectName },
    ]);

    if (onInviteMember) {
      onInviteMember({
        name: memberName,
        email,
        role,
        projectId: assignedProject,
      });
    }

    setName("");
    setEmail("");
    setJustInvitedSuccess(true);
    setTimeout(() => setJustInvitedSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-[560px] bg-white rounded-[12px] border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-[#F8F9FA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-primary-soft text-primary flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-foreground tracking-tight">
                Invite Teammates & Agents
              </h3>
              <p className="text-[11.5px] text-muted">
                Collaborate on shared bi-temporal memory for <strong className="text-foreground">{workspaceName}</strong>
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

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Email Invite Form with Project Scope Selector */}
          <form onSubmit={handleSendInvite} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Full Name / Handle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah, Alex, Client Rep"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-[12.5px] rounded-[8px] border border-border bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-[12.5px] rounded-[8px] border border-border bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Project Scope Access
                </label>
                <select
                  value={assignedProject}
                  onChange={(e) => setAssignedProject(e.target.value)}
                  className="w-full px-2.5 py-2 text-[12px] font-medium rounded-[8px] border border-border bg-subtle text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">🌐 All Projects in Workspace</option>
                  {projects
                    .filter((p) => p.id !== "all")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Role Assignment
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-2.5 py-2 text-[12px] rounded-[8px] border border-border bg-subtle text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="editor">Editor (Can Commit Commitments)</option>
                  <option value="viewer">Viewer (Read-Only Access)</option>
                  <option value="lead">Project Lead / Manager</option>
                  <option value="agent">Autonomous AI Agent</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-muted">
                {assignedProject === "all"
                  ? "Will have graph visibility across all workspace projects."
                  : "Scoped strictly to the selected project graph."}
              </span>
              <button
                type="submit"
                disabled={!email}
                className="px-4 py-2 text-[12.5px] font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-[8px] transition shadow-sm shrink-0"
              >
                Send Invite
              </button>
            </div>
          </form>

          {justInvitedSuccess && (
            <div className="p-2.5 rounded-[8px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11.5px] flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Teammate successfully invited and linked as a collaborator in the project graph!</span>
            </div>
          )}

          {/* Quick Copy Link Section */}
          <div className="pt-2 border-t border-border">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1.5">
              Or Share Quick Invite Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 px-3 py-1.5 text-[11px] font-mono rounded-[8px] border border-border bg-subtle text-muted select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium text-foreground bg-white hover:bg-subtle border border-border rounded-[8px] transition active:scale-[0.99] shrink-0 shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-muted" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Invited Members List */}
          <div className="pt-2">
            <h4 className="text-[11.5px] font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Active Workspace Collaborators:</span>
            </h4>
            <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
              {invitedList.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-[6px] bg-[#FAFBFD] border border-border text-[11.5px]"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] shrink-0">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <span className="font-semibold text-foreground block truncate">
                        {m.name}
                      </span>
                      <span className="text-[10px] text-muted font-mono block truncate">
                        {m.email} • {m.project}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-subtle text-muted border border-border shrink-0 capitalize">
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
