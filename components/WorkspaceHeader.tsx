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
}: WorkspaceHeaderProps) {
  const [isManageProjectOpen, setIsManageProjectOpen] = useState(false);
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
          {/* Left: User Identity & Active FalkorDB Tenant */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-primary text-white flex items-center justify-center text-[13px] font-bold shadow-xs">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-semibold text-foreground tracking-tight" suppressHydrationWarning>
                  {userName}&apos;s Workspace
                </h2>
                {isLoggedIn ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    <span>Live FalkorDB Graph</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold flex items-center gap-1 shadow-2xs">
                    <span>Sandbox Session (4 Personas)</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-muted flex items-center gap-1.5 mt-0.5">
                <Database className="w-3 h-3 text-primary" />
                <span>Tenant Container:</span>
                <span className="text-foreground font-semibold" suppressHydrationWarning>{graphName}</span>
              </p>
            </div>
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

            {/* + Project Button */}
            {onOpenCreateProject && (
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

            {/* Edit/Delete Project Action (if specific project is selected) */}
            {selectedProject !== "all" && currentProjectObj && (
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

            {isLoggedIn && onOpenInvite && (
              <button
                type="button"
                onClick={onOpenInvite}
                className="inline-flex items-center gap-1.5 h-[32px] px-3.5 text-[12px] font-medium text-foreground bg-white hover:bg-subtle border border-border rounded-[8px] transition active:scale-[0.99] shadow-xs cursor-pointer ml-1"
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
