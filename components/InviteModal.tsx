"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, Check, Copy, Shield, Users, Mail, FolderGit2, Sparkles } from "lucide-react";
import { isDummySandboxProject } from "@/lib/projects";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName?: string;
  graphName?: string;
  projects?: Array<{ id: string; name: string }>;
  selectedProject?: string;
  isGuest?: boolean;
  currentUser?: any;
  onInviteMember?: (member: { name: string; email: string; role: string; projectId: string }) => void;
}

export default function InviteModal({
  isOpen,
  onClose,
  workspaceName = "Workspace",
  graphName = "matters_live_user",
  projects = [
    { id: "all", name: "🌐 All Projects in Workspace" },
  ],
  selectedProject = "all",
  isGuest = false,
  currentUser = null,
  onInviteMember,
}: InviteModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [isAllWorkspace, setIsAllWorkspace] = useState(selectedProject === "all");
  const [chosenProjects, setChosenProjects] = useState<string[]>(() => {
    return selectedProject && selectedProject !== "all" ? [selectedProject] : [];
  });
  const [copied, setCopied] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);
  const [invitedList, setInvitedList] = useState<Array<{ name: string; email: string; role: string; project: string }>>([
    { name: "You (Owner)", email: "owner@workspace.local", role: "admin", project: "All Projects" }
  ]);
  const [justInvitedSuccess, setJustInvitedSuccess] = useState(false);

  // Synchronize invited collaborators from sandbox persistence
  useEffect(() => {
    if (!isOpen) return;
    try {
      const baseList = [
        { name: "You (Owner)", email: "owner@workspace.local", role: "admin", project: "All Projects" }
      ];
      const stored = localStorage.getItem("matters_sandbox_collaborators");
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list)) {
          const extra = list.map((c: any) => ({
            name: c.name || "Collaborator",
            email: c.email || "collab@workspace.local",
            role: c.role || "Member",
            project: Array.isArray(c.projects) ? c.projects.join(", ") : (c.project || "All Projects"),
          }));
          setInvitedList([...baseList, ...extra]);
          return;
        }
      }
      setInvitedList(baseList);
    } catch {
      setInvitedList([
        { name: "You (Owner)", email: "owner@workspace.local", role: "admin", project: "All Projects" }
      ]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resolvedProjectNames = isAllWorkspace || chosenProjects.length === 0
    ? "All Projects"
    : chosenProjects.join(", ");

  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "https://matters-wemakedevs-hackathon.vercel.app";
  const primaryProjectParam = isAllWorkspace || chosenProjects.length === 0 ? "all" : (chosenProjects[0] || "all");
  const ownerUid = currentUser?.uid || (isGuest ? "sandbox" : "owner");
  
  // Real-time link that reflects chosen project, workspace owner, and role assignment
  const inviteLink = `${currentOrigin}/login?workspaceOwner=${encodeURIComponent(ownerUid)}&inviter=${encodeURIComponent(workspaceName)}&inviteProject=${encodeURIComponent(primaryProjectParam)}&role=${encodeURIComponent(role)}`;

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `Join ${workspaceName} on Matters (Real-Time Bi-Temporal Graph Workspace)!\nProject: ${resolvedProjectNames}\nRole: ${role.toUpperCase()}\nAccess Link: ${inviteLink}`
  )}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const memberName = name.trim() || email.split("@")[0];
    const targetProjectsList = isAllWorkspace || chosenProjects.length === 0
      ? projects.filter((p) => p.id !== "all").map((p) => p.id)
      : chosenProjects;

    setInvitedList((prev) => [
      ...prev,
      { name: memberName, email, role, project: resolvedProjectNames },
    ]);

    // Send real invitation email via Gmail SMTP
    setIsSendingEmail(true);
    setEmailStatusMessage("Sending invitation email via Gmail...");
    try {
      const res = await fetch("/api/invite/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          inviterName: workspaceName,
          workspaceName,
          projectName: resolvedProjectNames,
          role,
          inviteLink,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatusMessage(`Invitation email sent to ${email}!`);
      } else {
        setEmailStatusMessage(`Notice: ${data.message || "Email delivery queued"}`);
      }
    } catch {
      setEmailStatusMessage(`Link ready to share: ${inviteLink}`);
    } finally {
      setIsSendingEmail(false);
    }

    if (onInviteMember) {
      onInviteMember({
        name: memberName,
        email,
        role,
        projectId: primaryProjectParam,
      });
    }

    setName("");
    setEmail("");
    setJustInvitedSuccess(true);
    setTimeout(() => {
      setJustInvitedSuccess(false);
      setEmailStatusMessage(null);
    }, 4000);
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
          {/* Sandbox Demo Scenario Banner */}
          {isGuest && (
            <div className="p-3.5 rounded-[10px] bg-gradient-to-r from-amber-50 to-orange-50/60 border border-amber-200 text-[11.5px] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-amber-950">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Sandbox Live Demo: 1-Click Teammate Simulation</span>
                </div>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 font-bold">
                  Demo Mode
                </span>
              </div>
              <p className="text-amber-800 leading-relaxed text-[11px]">
                Instantly simulate onboarding <strong>Dr. Sofia (Security Auditor Agent)</strong> into your selected project graph(s) below without waiting for real email confirmations.
              </p>
              <div className="flex flex-wrap gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const targetProjectsList = isAllWorkspace || chosenProjects.length === 0
                      ? projects.filter((p) => p.id !== "all").map((p) => p.id)
                      : chosenProjects;

                    try {
                      const existing = JSON.parse(localStorage.getItem("matters_sandbox_collaborators") || "[]");
                      const filtered = existing.filter((c: any) => !c.name?.toLowerCase().includes("sofia"));
                      const updated = [
                        ...filtered,
                        {
                          name: "Dr. Sofia",
                          email: "sofia.security@matters.ai",
                          role: "Security Auditor (Agent)",
                          projects: targetProjectsList,
                        },
                      ];
                      localStorage.setItem("matters_sandbox_collaborators", JSON.stringify(updated));
                    } catch {}

                    const demoMember = {
                      name: "Dr. Sofia",
                      email: "sofia.security@matters.ai",
                      role: "Security Auditor (Agent)",
                      project: targetProjectsList.join(", "),
                    };
                    setInvitedList((prev) => [demoMember, ...prev]);
                    if (onInviteMember) {
                      onInviteMember({
                        name: demoMember.name,
                        email: demoMember.email,
                        role: demoMember.role,
                        projectId: targetProjectsList[0] || "all",
                      });
                    }
                    setJustInvitedSuccess(true);
                    setTimeout(() => setJustInvitedSuccess(false), 3000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-[6px] font-medium text-[11px] shadow-xs cursor-pointer transition active:scale-95"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Simulate: Add Dr. Sofia (Security Auditor Agent)</span>
                </button>
              </div>
            </div>
          )}

          {/* Email Invite Form with Project Scope Selector */}
          <form onSubmit={handleSendInvite} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Full Name / Handle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Sofia, Alex, QA Auditor"
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

            {/* Project Scope Checkboxes (Allow All, 1, or Multi-select) */}
            <div className="p-3 rounded-[8px] border border-border bg-[#F8F9FB] space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Project Scope Access (Multi-select)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsAllWorkspace(!isAllWorkspace);
                    if (!isAllWorkspace) setChosenProjects([]);
                  }}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded border transition cursor-pointer ${
                    isAllWorkspace
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-muted border-border hover:text-foreground"
                  }`}
                >
                  🌐 All Workspace Projects
                </button>
              </div>

              {!isAllWorkspace && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {projects
                    .filter((p) => p.id !== "all" && (isGuest || (!isDummySandboxProject(p.id) && !isDummySandboxProject(p.name))))
                    .map((p) => {
                      const isChecked = chosenProjects.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-2 p-2 rounded-[6px] border text-[11.5px] font-medium cursor-pointer transition ${
                            isChecked
                              ? "bg-primary-soft/40 border-primary text-primary"
                              : "bg-white border-border text-foreground hover:bg-subtle"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setChosenProjects((prev) => [...prev, p.id]);
                              } else {
                                setChosenProjects((prev) => prev.filter((id) => id !== p.id));
                              }
                            }}
                            className="rounded border-border text-primary focus:ring-0 cursor-pointer"
                          />
                          <span className="truncate">{p.name}</span>
                        </label>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Role Selection & Submit Button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-end">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Role Assignment
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-2.5 py-2 text-[12px] rounded-[8px] border border-border bg-white text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="editor">Editor (Can Commit Commitments)</option>
                  <option value="viewer">Viewer (Read-Only Access)</option>
                  <option value="lead">Project Lead / Manager</option>
                  <option value="agent">Autonomous AI Agent (Security / QA)</option>
                </select>
                <p className="text-[10.5px] text-muted mt-1.5 leading-tight">
                  {role === "viewer"
                    ? "🔒 Viewer: Read-only access. Can inspect graph and timeline, but cannot commit or edit."
                    : role === "lead"
                    ? "⭐ Lead: Full project manager rights with co-ownership and member coordination."
                    : role === "agent"
                    ? "🤖 Agent: Autonomous AI worker with automated ingestion and graph audit rights."
                    : "✏️ Editor: Can commit, update, and manage commitments in this shared project graph."}
                </p>
              </div>

              <button
                type="submit"
                disabled={!email || isSendingEmail}
                className="w-full py-2 text-[12.5px] font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-[8px] transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{isSendingEmail ? "Sending via Gmail..." : "Send Gmail Invite"}</span>
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium text-foreground bg-white hover:bg-subtle border border-border rounded-[8px] transition active:scale-[0.99] shrink-0 shadow-sm cursor-pointer"
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

              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-300/80 rounded-[8px] transition active:scale-[0.99] shrink-0 shadow-xs cursor-pointer"
                title="Share via WhatsApp"
              >
                <svg className="w-3.5 h-3.5 fill-emerald-600" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.087-.177.182-.076.356.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.392-10.416c-5.522 0-10 4.477-10 10 0 1.764.457 3.42 1.258 4.863l-1.297 4.737 4.863-1.275c1.401.765 3.003 1.175 4.676 1.175 5.523 0 10-4.477 10-10s-4.477-10-10-10z" />
                </svg>
                <span>WhatsApp</span>
              </a>
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
