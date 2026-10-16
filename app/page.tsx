"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import WorkspaceHeader from "@/components/WorkspaceHeader";
import SandboxSwitcher, { PERSONAS } from "@/components/SandboxSwitcher";
import {
  cleanProjectName,
  formatProjectDisplay,
  isAllProject,
  DEFAULT_WORKSPACE_PROJECTS,
  SANDBOX_WORKSPACE_PROJECTS,
  PERSONA_PROJECTS,
} from "@/lib/projects";
import QuickCapture from "@/components/QuickCapture";
import MemoryGraph from "@/components/MemoryGraph";
import TimeTravel from "@/components/TimeTravel";
import ProvenanceCard from "@/components/ProvenanceCard";
import InviteModal from "@/components/InviteModal";
import CreateProjectModal from "@/components/CreateProjectModal";
import SignOutModal from "@/components/SignOutModal";
import DeleteAccountModal from "@/components/DeleteAccountModal";
import ExitSandboxModal from "@/components/ExitSandboxModal";
import WorkspaceChat from "@/components/WorkspaceChat";
import LiveDemoStoryboard from "@/components/LiveDemoStoryboard";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [asOfDate, setAsOfDate] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const isGuestSession = localStorage.getItem("matters_sandbox_guest") === "true";
      if (!isGuestSession && localStorage.getItem("matters_dev_user")) {
        return new Date().toISOString().split("T")[0];
      }
    }
    return "2026-08-15";
  });
  const [currentUser, setCurrentUser] = useState<any | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("matters_dev_user");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return null;
  });
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("matters_sandbox_guest") === "true";
    }
    return false;
  });
  const [selectedPersona, setSelectedPersona] = useState<string>("aris");
  const [selectedMemory, setSelectedMemory] = useState<any | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [selectedProject, setSelectedProject] = useState<string>("all");

  // Modals state
  const [isInviteOpen, setIsInviteOpen] = useState<boolean>(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState<boolean>(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState<boolean>(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState<boolean>(false);
  const [isExitSandboxOpen, setIsExitSandboxOpen] = useState<boolean>(false);

  const [mounted, setMounted] = useState<boolean>(false);
  const [userProjects, setUserProjects] = useState<Array<{ id: string; name: string }>>(
    DEFAULT_WORKSPACE_PROJECTS
  );

  // Sync auth state and clean up any old legacy projects from past sessions
  useEffect(() => {
    setMounted(true);

    // 1. Purge legacy global key so old dummy projects never linger
    try {
      localStorage.removeItem("matters_user_projects");
    } catch {}

    // 2. Check dev user or guest mode
    const devUserStr = localStorage.getItem("matters_dev_user");
    const sandboxGuest = localStorage.getItem("matters_sandbox_guest");

    if (devUserStr) {
      try {
        const parsed = JSON.parse(devUserStr);
        setCurrentUser(parsed);
        setIsGuest(false);

        // Load user-specific projects if any
        const userProjectsKey = `matters_projects_${parsed.uid}`;
        const saved = localStorage.getItem(userProjectsKey);
        if (saved) {
          const userProjs = JSON.parse(saved);
          if (Array.isArray(userProjs) && userProjs.length > 0) {
            const sanitized = userProjs
              .map((p: any) => ({
                id: cleanProjectName(p.id || p.name),
                name: formatProjectDisplay(p.name || p.id),
              }))
              .filter((p: any) => p.id && !isAllProject(p.id));
            setUserProjects(
              sanitized.length > 0
                ? [DEFAULT_WORKSPACE_PROJECTS[0], ...sanitized]
                : DEFAULT_WORKSPACE_PROJECTS
            );
          }
        } else {
          setUserProjects(DEFAULT_WORKSPACE_PROJECTS);
        }
      } catch (e) {
        // ignore
      }
    } else if (sandboxGuest === "true") {
      setIsGuest(true);
      setUserProjects(SANDBOX_WORKSPACE_PROJECTS);
    } else {
      // Direct visit without active session or sandbox guest -> Route to /login first!
      router.replace("/login");
      return;
    }

    // 3. Listen to live Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const profile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split("@")[0] || "User",
          photoURL: user.photoURL,
        };
        setCurrentUser(profile);
        setIsGuest(false);
        localStorage.setItem("matters_dev_user", JSON.stringify(profile));
      }
    });

    // 4. Auto-select invited project from query params or persistent session invite
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const projParam = urlParams.get("project");
      let pendingProj: string | null = null;
      const storedPending = sessionStorage.getItem("matters_pending_invite");
      if (storedPending) {
        try {
          const parsed = JSON.parse(storedPending);
          pendingProj = parsed.project;
          sessionStorage.removeItem("matters_pending_invite");
        } catch {}
      }
      const targetProj = projParam || pendingProj;
      if (targetProj) {
        const cleanTarget = cleanProjectName(targetProj);
        if (cleanTarget && !isAllProject(cleanTarget)) {
          setSelectedProject(cleanTarget);
        }
      }
    } catch {}

    return () => unsubscribe();
  }, []);


  // Reset selectedMemory whenever user session or guest mode changes to prevent sandbox memory leakage
  useEffect(() => {
    setSelectedMemory(null);
  }, [currentUser?.uid, isGuest]);

  // Set asOfDate to today's date for logged-in user so captured commitments are immediately Active
  useEffect(() => {
    if (currentUser && !isGuest) {
      setAsOfDate(new Date().toISOString().split("T")[0]);
    }
  }, [currentUser, isGuest]);

  const handleMemoryCaptured = (capturedData: any) => {
    if (capturedData?.extracted) {
      setSelectedMemory({
        ...capturedData.extracted,
        sourceId: capturedData.sourceId,
        status: "current",
      });
      // Synchronize timeline so newly captured commitment is immediately Active in the graph
      const capturedValidFrom = capturedData.extracted?.validFrom;
      if (capturedValidFrom && asOfDate < capturedValidFrom) {
        setAsOfDate(capturedValidFrom);
      }
      const pName = cleanProjectName(capturedData.extracted?.project);
      if (pName && !isAllProject(pName) && pName !== "General") {
        setUserProjects((prev) => {
          if (!prev.some((p) => cleanProjectName(p.id).toLowerCase() === pName.toLowerCase())) {
            const updated = [...prev, { id: pName, name: formatProjectDisplay(pName) }];
            if (currentUser?.uid && !isGuest) {
              localStorage.setItem(`matters_projects_${currentUser.uid}`, JSON.stringify(updated));
            }
            return updated;
          }
          return prev;
        });
      }
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const handleCreateProject = (newProj: { id: string; name: string; description: string }) => {
    const clean = cleanProjectName(newProj.name || newProj.id);
    if (!clean || isAllProject(clean)) return;

    // Un-delete if previously stored in deleted list
    try {
      const stored = localStorage.getItem("matters_deleted_projects");
      if (stored) {
        const list: string[] = JSON.parse(stored);
        const filtered = list.filter((d) => cleanProjectName(d).toLowerCase() !== clean.toLowerCase());
        localStorage.setItem("matters_deleted_projects", JSON.stringify(filtered));
      }
    } catch {}

    const updated = [
      ...userProjects.filter((p) => cleanProjectName(p.id).toLowerCase() !== clean.toLowerCase()),
      { id: clean, name: formatProjectDisplay(clean) },
    ];
    setUserProjects(updated);
    if (currentUser?.uid && !isGuest) {
      localStorage.setItem(`matters_projects_${currentUser.uid}`, JSON.stringify(updated));
    }
    setSelectedProject(clean);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleUpdateProject = async (id: string, newName: string) => {
    const oldClean = cleanProjectName(id);
    const newClean = cleanProjectName(newName);
    if (!oldClean || !newClean || isAllProject(oldClean) || isAllProject(newClean)) return;

    try {
      let authHeader = "";
      if (currentUser?.uid && !isGuest) {
        try {
          const token = await auth.currentUser?.getIdToken();
          authHeader = token ? `Bearer ${token}` : `Bearer ${currentUser.uid}`;
        } catch {
          authHeader = `Bearer ${currentUser.uid}`;
        }
      }
      await fetch("/api/project", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(isGuest ? { "x-guest-mode": "true" } : {}),
        },
        body: JSON.stringify({ oldName: oldClean, newName: newClean }),
      });
    } catch (e) {
      console.error("Failed to update project:", e);
    }

    const updated = userProjects.map((p) =>
      cleanProjectName(p.id).toLowerCase() === oldClean.toLowerCase()
        ? { id: newClean, name: formatProjectDisplay(newClean) }
        : p
    );
    setUserProjects(updated);
    if (currentUser?.uid && !isGuest) {
      localStorage.setItem(`matters_projects_${currentUser.uid}`, JSON.stringify(updated));
    }
    if (cleanProjectName(selectedProject).toLowerCase() === oldClean.toLowerCase()) {
      setSelectedProject(newClean);
    }
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDeleteProject = async (id: string) => {
    const cleanId = cleanProjectName(id);
    if (!cleanId || isAllProject(cleanId)) return;

    try {
      let authHeader = "";
      if (currentUser?.uid && !isGuest) {
        try {
          const token = await auth.currentUser?.getIdToken();
          authHeader = token ? `Bearer ${token}` : `Bearer ${currentUser.uid}`;
        } catch {
          authHeader = `Bearer ${currentUser.uid}`;
        }
      }
      await fetch("/api/project", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
          ...(isGuest ? { "x-guest-mode": "true" } : {}),
        },
        body: JSON.stringify({ projectName: cleanId }),
      });
    } catch (e) {
      console.error("Failed to delete project from graph:", e);
    }

    // Record deleted project in session storage so graph and dropdown filter it out
    try {
      const stored = localStorage.getItem("matters_deleted_projects");
      const list: string[] = stored ? JSON.parse(stored) : [];
      const lower = cleanId.toLowerCase();
      if (!list.includes(cleanId)) list.push(cleanId);
      if (!list.includes(lower)) list.push(lower);
      localStorage.setItem("matters_deleted_projects", JSON.stringify(list));
    } catch {}

    // Immediately clear selectedMemory if it belonged to this deleted project
    if (
      selectedMemory &&
      cleanProjectName(selectedMemory.project || "").toLowerCase() === cleanId.toLowerCase()
    ) {
      setSelectedMemory(null);
    }

    // Clean matters_guest_memories in localStorage if in guest mode
    try {
      const storedGuest = localStorage.getItem("matters_guest_memories");
      if (storedGuest) {
        const guestMems = JSON.parse(storedGuest);
        const filtered = guestMems.filter(
          (m: any) => cleanProjectName(m.project || "").toLowerCase() !== cleanId.toLowerCase()
        );
        localStorage.setItem("matters_guest_memories", JSON.stringify(filtered));
      }
    } catch {}

    const updated = userProjects.filter((p) => {
      const pClean = cleanProjectName(p.id).toLowerCase();
      const pNameClean = cleanProjectName(p.name).toLowerCase();
      const targetLower = cleanId.toLowerCase();
      return pClean !== targetLower && pNameClean !== targetLower;
    });

    setUserProjects(updated);
    if (currentUser?.uid && !isGuest) {
      localStorage.setItem(`matters_projects_${currentUser.uid}`, JSON.stringify(updated));
    }
    if (cleanProjectName(selectedProject).toLowerCase() === cleanId.toLowerCase()) {
      setSelectedProject("all");
    }
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleProjectsLoaded = (falkorProjects: string[]) => {
    let deletedList: string[] = [];
    try {
      const stored = localStorage.getItem("matters_deleted_projects");
      if (stored) deletedList = JSON.parse(stored);
    } catch {}

    const cleanDeleted = deletedList.map((d) => cleanProjectName(d).toLowerCase());

    if (isGuest) {
      // In guest sandbox mode, strictly use isolated sandbox projects filtered by deletedList
      const guestProjects = SANDBOX_WORKSPACE_PROJECTS.filter((p) => {
        if (p.id === "all") return true;
        const c = cleanProjectName(p.id).toLowerCase();
        return !cleanDeleted.includes(c);
      });
      setUserProjects(guestProjects);
      return;
    }

    const filtered = (falkorProjects || [])
      .map((name) => cleanProjectName(name))
      .filter((name) => name && !isAllProject(name) && !cleanDeleted.includes(name.toLowerCase()));

    setUserProjects((prev) => {
      let savedUserProjects: any[] = [];
      if (currentUser?.uid && !isGuest) {
        try {
          const savedStr = localStorage.getItem(`matters_projects_${currentUser.uid}`);
          if (savedStr) {
            const parsed = JSON.parse(savedStr);
            if (Array.isArray(parsed)) {
              savedUserProjects = parsed
                .map((p: any) => ({
                  id: cleanProjectName(p.id || p.name),
                  name: formatProjectDisplay(p.name || p.id),
                }))
                .filter(
                  (p: any) =>
                    p.id &&
                    !isAllProject(p.id) &&
                    !cleanDeleted.includes(p.id.toLowerCase())
                );
            }
          }
        } catch {}
      }

      const seenClean = new Set<string>();
      const combinedProjects = [DEFAULT_WORKSPACE_PROJECTS[0]];

      const addProject = (id: string) => {
        const clean = cleanProjectName(id);
        const lower = clean.toLowerCase();
        if (clean && !isAllProject(clean) && !cleanDeleted.includes(lower) && !seenClean.has(lower)) {
          seenClean.add(lower);
          combinedProjects.push({ id: clean, name: formatProjectDisplay(clean) });
        }
      };

      savedUserProjects.forEach((p) => addProject(p.id));
      filtered.forEach((pName) => addProject(pName));

      return combinedProjects;
    });
  };

  const handleConfirmedSignOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      // ignore
    }
    localStorage.removeItem("matters_dev_user");
    localStorage.removeItem("matters_sandbox_guest");
    localStorage.removeItem("matters_deleted_projects");
    setCurrentUser(null);
    setSelectedMemory(null);
    setUserProjects(DEFAULT_WORKSPACE_PROJECTS);
    setSelectedProject("all");
    setRefreshTrigger((prev) => prev + 1);
    window.location.href = "/login";
  };

  const handleConfirmedDeleteAccount = async () => {
    if (!currentUser?.uid) return;
    let token = "";
    try {
      token = (await auth.currentUser?.getIdToken()) || currentUser.uid;
    } catch {
      token = currentUser.uid;
    }

    const res = await fetch("/api/auth/user", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ uid: currentUser.uid }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to delete account.");
    }

    try {
      await auth.currentUser?.delete();
    } catch {
      try {
        await firebaseSignOut(auth);
      } catch {
        // ignore
      }
    }
    localStorage.removeItem("matters_dev_user");
    localStorage.removeItem("matters_user_projects");
    localStorage.removeItem("matters_sandbox_guest");
    localStorage.removeItem("matters_deleted_projects");
    setCurrentUser(null);
    setIsDeleteAccountOpen(false);
    window.location.href = "/login?mode=signup";
  };

  const handleConfirmedExitSandbox = () => {
    localStorage.removeItem("matters_sandbox_guest");
    localStorage.removeItem("matters_deleted_projects");
    setIsGuest(false);
    setSelectedPersona("aris");
    setUserProjects(DEFAULT_WORKSPACE_PROJECTS);
    setSelectedProject("all");
    setIsExitSandboxOpen(false);
    window.location.href = "/login";
  };

  const graphName = currentUser?.uid
    ? `matters_${currentUser.uid.substring(0, 8)}`
    : "matters_sandbox";

  // Follow selected persona in guest mode, or logged-in user
  const userName = isGuest
    ? PERSONAS[selectedPersona]?.name || "Prof. Aris"
    : currentUser?.displayName ||
      (currentUser?.email ? currentUser.email.split("@")[0] : "Amir");

  // Filter projects available to the active persona in sandbox mode
  let personaProjectIds = PERSONA_PROJECTS[selectedPersona] || [];
  if (selectedPersona === "sofia") {
    try {
      const storedCollabs = localStorage.getItem("matters_sandbox_collaborators");
      if (storedCollabs) {
        const collabs = JSON.parse(storedCollabs);
        const sofia = collabs.find((c: any) => c.name?.toLowerCase().includes("sofia"));
        if (sofia && Array.isArray(sofia.projects) && sofia.projects.length > 0) {
          personaProjectIds = sofia.projects.map((p: string) => cleanProjectName(p));
        }
      }
    } catch {}
  }

  const personaProjects = isGuest
    ? SANDBOX_WORKSPACE_PROJECTS.filter(
        (p) =>
          p.id === "all" ||
          personaProjectIds.some(
            (allowed) =>
              cleanProjectName(allowed).toLowerCase() === cleanProjectName(p.name).toLowerCase() ||
              cleanProjectName(allowed).toLowerCase() === cleanProjectName(p.id).toLowerCase()
          )
      )
    : userProjects;

  if (!mounted) {

    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary-soft">
        <header className="sticky top-0 z-50 w-full border-b border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="w-full px-4 sm:px-5 lg:px-6 h-[64px] flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[8px] bg-primary flex items-center justify-center text-white font-semibold text-[15px] shadow-sm">
                  M
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[16px] tracking-tight text-foreground">
                      Matters
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-subtle text-muted border border-border">
                      Agent Memory
                    </span>
                  </div>
                  <p className="text-[11px] text-muted hidden sm:block">
                    Because what people say, Matters.
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 h-[34px] px-3 rounded-[8px] bg-subtle border border-border text-[12px] text-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
              <span>FalkorDB Graph</span>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px] font-mono text-muted">Loading workspace...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary-soft">
      {/* Top Navbar */}
      <Navbar
        userEmail={isGuest ? null : currentUser?.email || null}
        userName={userName}
        photoURL={isGuest ? null : currentUser?.photoURL || null}
        graphName={isGuest ? "matters_sandbox" : graphName}
        isLoggedIn={!isGuest && !!currentUser}
        isGuest={isGuest}
        onSignIn={() => router.push("/login?mode=signin")}
        onSignUp={() => router.push("/login?mode=signup")}
        onSignOut={() => setIsSignOutModalOpen(true)}
        onDeleteAccount={() => setIsDeleteAccountOpen(true)}
        onExitSandbox={() => setIsExitSandboxOpen(true)}
      />

      {/* Main Workspace Dashboard: HCI Bento Grid */}
      <main className="flex-1 w-full mx-auto px-4 sm:px-5 lg:px-6 py-4 space-y-4">
        {/* Workspace & Project Bar */}
        <WorkspaceHeader
          isLoggedIn={!isGuest && !!currentUser}
          userName={userName}
          userEmail={currentUser?.email}
          graphName={isGuest ? "matters_sandbox" : graphName}
          selectedProject={selectedProject}
          onSelectProject={setSelectedProject}
          projects={personaProjects}
          onOpenCreateProject={() => setIsCreateProjectOpen(true)}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
          onOpenInvite={() => setIsInviteOpen(true)}
          onExitSandbox={() => setIsExitSandboxOpen(true)}
        />

        {/* Synthetic Sandbox Persona Switcher (Guest Mode only) */}
        {isGuest && (
          <SandboxSwitcher
            currentPersona={selectedPersona}
            refreshTrigger={refreshTrigger}
            onSelectPersona={(personaId) => {
              setSelectedPersona(personaId);
              let allowed = PERSONA_PROJECTS[personaId] || [];
              if (personaId === "sofia") {
                try {
                  const stored = localStorage.getItem("matters_sandbox_collaborators");
                  if (stored) {
                    const parsed = JSON.parse(stored);
                    const s = parsed.find((c: any) => c.name?.toLowerCase().includes("sofia"));
                    if (s && Array.isArray(s.projects) && s.projects.length > 0) {
                      allowed = s.projects;
                    }
                  }
                } catch {}
              }
              const isAllowed = (proj: string) =>
                allowed.some((a) => cleanProjectName(a).toLowerCase() === cleanProjectName(proj).toLowerCase());

              if (selectedProject !== "all" && !isAllowed(selectedProject)) {
                setSelectedProject(allowed[0] || "all");
              }
              setRefreshTrigger((prev) => prev + 1);
            }}
            onResetSandbox={() => {
              try {
                localStorage.removeItem("matters_guest_memories");
                localStorage.removeItem("matters_reverted_memories");
                localStorage.removeItem("matters_deleted_projects");
                localStorage.removeItem("matters_sandbox_collaborators");
              } catch {}
              setSelectedPersona("aris");
              setSelectedProject("all");
              setSelectedMemory(null);
              setAsOfDate("2026-08-15");
              setRefreshTrigger((prev) => prev + 1);
            }}
          />
        )}


        {/* Live Interactive Demo Storyboard (1-Click Fail-Proof Judges Showcase) */}
        <LiveDemoStoryboard
          currentUser={currentUser}
          isGuest={isGuest}
          onScenarioExecuted={(memory, targetDate, targetProject) => {
            setSelectedMemory(memory);
            setAsOfDate(targetDate);
            if (targetProject) {
              setSelectedProject(targetProject);
            }
            setRefreshTrigger((prev) => prev + 1);
          }}
        />

        {/* BENTO GRID ROW 1: Hero Canvas & Command Stack */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
          {/* BENTO CELL 1: The Hero Frame - Expansive FalkorDB Graph Canvas (Span 8 Cols) */}
          <div className="xl:col-span-8 h-full min-h-[660px] flex flex-col">
            <MemoryGraph
              asOfDate={asOfDate}
              selectedProject={selectedProject}
              currentUser={currentUser}
              persona={selectedPersona}
              isGuest={isGuest}
              onNodeClick={(details) => setSelectedMemory(details)}
              onProjectsLoaded={handleProjectsLoaded}
              onAsOfDateChange={setAsOfDate}
              refreshTrigger={refreshTrigger}
            />
          </div>

          {/* BENTO CELL 2 & 3: Command & Time Stack (Span 4 Cols) */}
          <div className="xl:col-span-4 flex flex-col gap-4 justify-between">
            {/* Cell 2: Smart Quick Capture Form */}
            <QuickCapture
              currentUser={currentUser}
              selectedProject={selectedProject}
              projects={personaProjects}
              onMemoryCaptured={handleMemoryCaptured}
            />

            {/* Cell 3: Bi-Temporal Time Travel Scrubber */}
            <TimeTravel
              asOfDate={asOfDate}
              currentUser={currentUser}
              isGuest={isGuest}
              selectedProject={selectedProject}
              refreshTrigger={refreshTrigger}
              onAsOfDateChange={setAsOfDate}
              onSelectResult={(res) => {
                let deletedList: string[] = [];
                try {
                  const stored = localStorage.getItem("matters_deleted_projects");
                  if (stored) deletedList = JSON.parse(stored).map((d: string) => String(d).toLowerCase().trim());
                } catch {}

                const mem = res?.activeMemories?.find((m: any) => {
                  const p = String(m.project || "").toLowerCase().trim();
                  return !deletedList.includes(p);
                });

                if (mem) {
                  const isSandbox = Boolean(
                    (mem.sourceId && String(mem.sourceId).startsWith("sandbox_")) ||
                    (mem.id && String(mem.id).startsWith("sandbox_"))
                  );
                  if (isGuest && isSandbox) {
                    setSelectedMemory(mem);
                  } else if (!isGuest && !isSandbox) {
                    setSelectedMemory(mem);
                  }
                } else {
                  setSelectedMemory(null);
                }
              }}
            />
          </div>
        </div>

        {/* BENTO GRID ROW 2: Deep Provenance & AI Workspace Assistant */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
          {/* BENTO CELL 4: Provenance & Verification Card (Span 5 Cols) */}
          <div className="xl:col-span-5 h-[440px]">
            <ProvenanceCard
              selectedMemory={selectedMemory}
              projects={userProjects}
              currentUser={currentUser}
              asOfDate={asOfDate}
              onMemoryUpdated={(updated) => {
                setSelectedMemory(updated);
                if (updated?.status === "current" && updated?.validFrom && asOfDate < updated.validFrom) {
                  setAsOfDate(updated.validFrom);
                }
                setRefreshTrigger((prev) => prev + 1);
              }}
              onMemoryReverted={() => {
                setSelectedMemory(null);
                setRefreshTrigger((prev) => prev + 1);
              }}
            />
          </div>

          {/* BENTO CELL 5: Matters AI Workspace Assistant (Span 7 Cols) */}
          <div className="xl:col-span-7 h-[440px]">
            <WorkspaceChat
              currentUser={currentUser}
              selectedProject={selectedProject}
              persona={selectedPersona}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-[#FAFAFA] py-4 px-4 sm:px-6 lg:px-8 text-[12px] text-muted mt-auto">
        <div className="max-w-[1560px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-primary text-white font-bold flex items-center justify-center text-[10px]">
              M
            </div>
            <span className="font-semibold text-foreground">Matters</span>
            <span>— Built by Muhammad Amir Hakim</span>
          </div>

          <div className="text-[11px] text-muted font-mono">
            FalkorDB Graph Hacks 2026 • Real-Time Agent Memory & Coordination
          </div>
        </div>
      </footer>

      {/* Invite Teammates Modal */}
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        workspaceName={`${userName}'s Workspace`}
        graphName={graphName}
        projects={personaProjects}
        selectedProject={selectedProject}
        isGuest={isGuest}
        onInviteMember={() => setRefreshTrigger((prev) => prev + 1)}
      />

      {/* Create New Project Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onCreateProject={handleCreateProject}
      />

      {/* Custom Sign Out Confirmation Modal */}
      <SignOutModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirm={handleConfirmedSignOut}
        userEmail={currentUser?.email || "current session"}
      />

      {/* Delete Account Confirmation Modal */}
      <DeleteAccountModal
        isOpen={isDeleteAccountOpen}
        onClose={() => setIsDeleteAccountOpen(false)}
        onConfirm={handleConfirmedDeleteAccount}
        userEmail={currentUser?.email}
        graphName={graphName}
      />

      {/* Exit Sandbox Confirmation Modal */}
      <ExitSandboxModal
        isOpen={isExitSandboxOpen}
        onClose={() => setIsExitSandboxOpen(false)}
        onConfirm={handleConfirmedExitSandbox}
      />
    </div>
  );
}
