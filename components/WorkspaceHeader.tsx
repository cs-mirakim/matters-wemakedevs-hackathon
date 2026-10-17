"use client";

import React, { useState } from "react";
import {
  FolderPlus,
  UserPlus,
  ChevronDown,
  Database,
  Edit2,
  Trash2,
  LogOut,
  Sparkles,
} from "lucide-react";
import ManageProjectModal from "./ManageProjectModal";
import {
  cleanProjectName,
  formatProjectDisplay,
  DEFAULT_WORKSPACE_PROJECTS,
  type WorkspaceProjectItem,
} from "@/lib/projects";

export type WorkspaceProject = WorkspaceProjectItem;
export { DEFAULT_WORKSPACE_PROJECTS };

interface SharedWorkspaceEntry {
  workspaceOwner: string;
  workspaceName: string;
  project: string;
  role: string;
  joinedAt: string;
}

interface WorkspaceHeaderProps {
  isLoggedIn: boolean;
  userName?: string;
  userEmail?: string;
  graphName?: string;
  selectedProject: string;
  onSelectProject: (projectId: string) => void;
  projects?: WorkspaceProject[];
  onOpenCreateProject?: () => void;
  onUpdateProject?: (id: string, newName: string) => void;
  onDeleteProject?: (id: string) => void;
  onOpenInvite?: () => void;
  onExitSandbox?: () => void;
  workspaceOwner?: string | null;
  sharedWorkspaceName?: string | null;
  userRole?: string;
  sharedWorkspaces?: SharedWorkspaceEntry[];
  onSelectWorkspace?: (
    workspaceOwner: string | null,
    workspaceName?: string,
    project?: string,
    role?: string
  ) => void;
  onRemoveSharedWorkspace?: (workspaceOwner: string, project: string) => void;
}

export default function WorkspaceHeader({
  isLoggedIn = false,
  userName = "Guest User",
  userEmail,
  graphName = "matters_live_user",
  selectedProject = "all",
  onSelectProject,
  projects,
  onOpenCreateProject,
  onUpdateProject,
  onDeleteProject,
  onOpenInvite,
  onExitSandbox,
  workspaceOwner = null,
  sharedWorkspaceName = null,
  userRole = "admin",
  sharedWorkspaces = [],
  onSelectWorkspace,
  onRemoveSharedWorkspace,
}: WorkspaceHeaderProps) {
  const [isManageProjectOpen, setIsManageProjectOpen] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const isViewer = userRole?.toLowerCase() === "viewer";
  const availableProjects = projects && projects.length > 0 ? projects : DEFAULT_WORKSPACE_PROJECTS;
  const currentProjectObj =
    availableProjects.find(
      (p) =>
        p.id === selectedProject ||
        p.name === selectedProject ||
        cleanProjectName(p.name).toLowerCase() === cleanProjectName(selectedProject).toLowerCase() ||
        cleanProjectName(p.id).toLowerCase() === cleanProjectName(selectedProject).toLowerCase()
    ) || null;

  return (
    <>
      <div className="bg-card rounded-[14px] border border-border shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Left: Interactive Workspace Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsWorkspaceMenuOpen((prev) => !prev)}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-[12px] hover:bg-slate-100 transition border border-transparent hover:border-border text-left cursor-pointer group"
              title="Click to switch workspace"
            >
              <div
                className={`w-9 h-9 rounded-[10px] flex items-center justify-center text-[13px] font-bold shadow-xs transition ${
                  workspaceOwner
                    ? "bg-indigo-600 text-white"
                    : "bg-primary text-white"
                }`}
              >
                {workspaceOwner ? "🤝" : (userName.charAt(0).toUpperCase())}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h2
                    className="text-[14px] font-semibold text-foreground tracking-tight group-hover:text-primary transition flex items-center gap-1"
                    suppressHydrationWarning
                  >
                    <span>
                      {workspaceOwner
                        ? `${sharedWorkspaceName || "Shared"}'s Workspace`
                        : `${userName}'s Workspace`}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-muted transition duration-200 ${
                        isWorkspaceMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </h2>

                  {workspaceOwner ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold flex items-center gap-1.5 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                      <span>Collaborator ({userRole?.toUpperCase() || "EDITOR"})</span>
                    </span>
                  ) : isLoggedIn ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1.5 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      <span>Live FalkorDB Graph</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold flex items-center gap-1 shadow-2xs">
                      <span>Sandbox Session (4 Personas)</span>
                    </span>
                  )}

                  {sharedWorkspaces.length > 0 && !workspaceOwner && (
                    <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                      +{sharedWorkspaces.length} Shared
                    </span>
                  )}
                </div>

                <p className="text-[11px] font-mono text-muted flex items-center gap-1.5 mt-0.5">
                  <Database className="w-3 h-3 text-primary" />
                  <span>Tenant Container:</span>
                  <span className="text-foreground font-semibold" suppressHydrationWarning>
                    {graphName}
                  </span>
                </p>
              </div>
            </button>

            {/* Dropdown Menu Modal/Popover */}
            {isWorkspaceMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsWorkspaceMenuOpen(false)}
                />
                <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-[16px] shadow-2xl border border-border z-50 p-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-border/60 flex items-center justify-between">
                    <p className="text-[10.5px] font-bold tracking-wider uppercase text-muted">
                      Switch Active Workspace
                    </p>
                    <span className="text-[10px] font-mono text-muted">
                      {1 + sharedWorkspaces.length} Available
                    </span>
                  </div>

                  {/* Personal Workspace Option */}
                  <div className="mt-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsWorkspaceMenuOpen(false);
                        if (onSelectWorkspace) onSelectWorkspace(null);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-[12px] text-left transition cursor-pointer ${
                        !workspaceOwner
                          ? "bg-primary-soft/80 border border-primary/30"
                          : "hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">
                          🏢
                        </div>
                        <div>
                          <p className="text-[12.5px] font-semibold text-foreground">
                            {userName}&apos;s Workspace
                          </p>
                          <p className="text-[10.5px] text-muted font-mono">
                            Personal • Owner • Isolated FalkorDB Graph
                          </p>
                        </div>
                      </div>
                      {!workspaceOwner && (
                        <span className="text-primary font-bold text-xs bg-primary/10 px-2 py-0.5 rounded-full">
                          ✓ Active
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Collaborative Workspaces Section */}
                  <div className="mt-2.5 pt-2 border-t border-border/60">
                    <div className="px-3 py-1 flex items-center justify-between">
                      <p className="text-[10.5px] font-bold tracking-wider uppercase text-muted">
                        Joined Team Workspaces ({sharedWorkspaces.length})
                      </p>
                    </div>

                    {sharedWorkspaces.length > 0 ? (
                      <div className="mt-1 space-y-1 max-h-56 overflow-y-auto">
                        {sharedWorkspaces.map((sw) => {
                          const isActive = workspaceOwner === sw.workspaceOwner;
                          return (
                            <div
                              key={`${sw.workspaceOwner}_${sw.project}`}
                              className={`flex items-center justify-between p-2 rounded-[12px] transition ${
                                isActive
                                  ? "bg-indigo-50 border border-indigo-200"
                                  : "hover:bg-slate-50 border border-transparent"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setIsWorkspaceMenuOpen(false);
                                  if (onSelectWorkspace) {
                                    onSelectWorkspace(
                                      sw.workspaceOwner,
                                      sw.workspaceName,
                                      sw.project,
                                      sw.role
                                    );
                                  }
                                }}
                                className="flex-1 flex items-center gap-2.5 text-left cursor-pointer min-w-0"
                              >
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                  🤝
                                </div>
                                <div className="truncate">
                                  <p className="text-[12px] font-semibold text-foreground truncate">
                                    {sw.workspaceName}&apos;s Workspace
                                  </p>
                                  <p className="text-[10.5px] text-muted font-mono truncate">
                                    Role: {sw.role.toUpperCase()} • Project: {formatProjectDisplay(sw.project)}
                                  </p>
                                </div>
                              </button>

                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                {isActive && (
                                  <span className="text-indigo-600 font-bold text-xs bg-indigo-100 px-2 py-0.5 rounded-full">
                                    ✓ Active
                                  </span>
                                )}
                                {onRemoveSharedWorkspace && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRemoveSharedWorkspace(sw.workspaceOwner, sw.project);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 transition cursor-pointer"
                                    title="Leave this shared workspace"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-3 text-center text-[11px] text-muted italic">
                        No team workspaces saved yet. When a teammate invites you via WhatsApp or link, accepting it will save it here permanently.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right: Project Dropdown Selector, Manage Controls & Actions */}
          <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
            <span className="text-[12px] text-muted font-medium hidden sm:inline">
              Project:
            </span>
            <div className="relative">
              <select
                value={selectedProject}
                onChange={(e) => onSelectProject(e.target.value)}
                className="text-[12px] font-medium bg-white hover:bg-subtle text-foreground border border-border rounded-[8px] pl-3 pr-8 py-1.5 focus:outline-none focus:border-primary cursor-pointer appearance-none shadow-xs transition"
              >
                {availableProjects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {formatProjectDisplay(proj.name || proj.id)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* + Project Button (Hidden for Viewers) */}
            {onOpenCreateProject && !isViewer && (
              <button
                type="button"
                onClick={onOpenCreateProject}
                className="inline-flex items-center gap-1 h-[32px] px-2.5 text-[11.5px] font-medium text-primary hover:text-primary-hover bg-primary-soft/60 hover:bg-primary-soft border border-primary/25 rounded-[8px] transition active:scale-[0.99] shadow-2xs cursor-pointer"
                title="Create new project in this graph"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ Project</span>
              </button>
            )}

            {/* Edit/Delete Project Action (if specific project is selected, hidden for Viewers) */}
            {selectedProject !== "all" && currentProjectObj && !isViewer && (
              <button
                type="button"
                onClick={() => setIsManageProjectOpen(true)}
                className="inline-flex items-center gap-1 h-[32px] px-2.5 text-[11.5px] font-medium text-muted hover:text-foreground bg-white hover:bg-subtle border border-border rounded-[8px] transition active:scale-[0.99] cursor-pointer"
                title="Manage or delete this project"
              >
                <Edit2 className="w-3 h-3 text-muted" />
                <span>Manage</span>
              </button>
            )}

            {onOpenInvite && (
              <button
                type="button"
                onClick={onOpenInvite}
                className="inline-flex items-center gap-1.5 h-[32px] px-3.5 text-[12px] font-medium text-foreground bg-white hover:bg-subtle border border-border rounded-[8px] transition active:scale-[0.99] shadow-xs cursor-pointer ml-1"
                title="Invite collaborators or simulate onboarding"
              >
                <UserPlus className="w-3.5 h-3.5 text-primary" />
                <span>Invite Teammate</span>
              </button>
            )}

          </div>
        </div>
      </div>

      {/* Manage Project Modal for Edit/Delete */}
      <ManageProjectModal
        key={currentProjectObj?.id || selectedProject}
        isOpen={isManageProjectOpen}
        onClose={() => setIsManageProjectOpen(false)}
        project={currentProjectObj}
        onUpdateProject={(id, newName) => {
          if (onUpdateProject) onUpdateProject(id, newName);
        }}
        onDeleteProject={(id) => {
          if (onDeleteProject) onDeleteProject(id);
        }}
      />
    </>
  );
}
