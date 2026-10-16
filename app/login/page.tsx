"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import {
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  LogIn,
  UserPlus,
  Globe,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";

  const [activeTab, setActiveTab] = useState<"signin" | "signup">(initialMode);
  const [loading, setLoading] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [entryStepText, setEntryStepText] = useState("Initializing system...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Invite link detection & persistence across auth flows
  const inviteProjectParam = searchParams.get("inviteProject");
  const inviterParam = searchParams.get("inviter");
  const [pendingInvite, setPendingInvite] = useState<{ project: string; inviter?: string } | null>(null);

  useEffect(() => {
    if (inviteProjectParam) {
      const inviteData = {
        project: decodeURIComponent(inviteProjectParam),
        inviter: inviterParam ? decodeURIComponent(inviterParam) : undefined,
      };
      setPendingInvite(inviteData);
      try {
        sessionStorage.setItem("matters_pending_invite", JSON.stringify(inviteData));
      } catch {}
    } else {
      try {
        const stored = sessionStorage.getItem("matters_pending_invite");
        if (stored) {
          setPendingInvite(JSON.parse(stored));
        }
      } catch {}
    }
  }, [inviteProjectParam, inviterParam]);


  // Left banner slides
  const [activeSlide, setActiveSlide] = useState(0);
  const slides = [
    {
      step: "01 • BI-TEMPORAL AGENT MEMORY",
      title: "Live Bi-Temporal Graph & Gemini AI.",
      desc: "Spatial and temporal commitment tracking in FalkorDB Cloud with Gemini 3.5 Flash Lite structured reasoning.",
      tag: "FalkorDB Cloud • Gemini 3.5 Flash Lite • Zero Amnesia",
    },
    {
      step: "02 • ATOMIC CYPHER SUPERSEDE",
      title: "Self-Healing Historical Lineage.",
      desc: "When commitments change or scopes creep, old promises are closed and versioned without mutating past truth.",
      tag: "Cypher Query 1 • IDOR Protected • Real Graph",
    },
    {
      step: "03 • TIME TRAVEL RECONSTRUCTION",
      title: "Query Any Slice in History.",
      desc: "Slide back and forth across project timelines to inspect what was valid as of any given calendar date.",
      tag: "As-Of State • Provenance Trace • Full Audit",
    },
  ];

  // Auto-slide showcase banner every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "signup" || mode === "signin") {
      setActiveTab(mode);
    }
  }, [searchParams]);

  // Purge lingering session data when landing on login & prefetch dashboard for instant navigation
  useEffect(() => {
    try {
      localStorage.removeItem("matters_dev_user");
      localStorage.removeItem("matters_sandbox_guest");
      localStorage.removeItem("matters_guest_memories");
      localStorage.removeItem("matters_reverted_memories");
      localStorage.removeItem("matters_deleted_projects");
    } catch {}
    try {
      router.prefetch("/");
    } catch {}
  }, [router]);

  // Handle redirect result when popup is blocked by browser
  useEffect(() => {
    async function processRedirectAuth() {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const googleUser = result.user;
          setIsEntering(true);
          setEntryStepText("Verifying user account in FalkorDB...");

          const checkRes = await fetch("/api/auth/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "check", identifier: googleUser.email }),
          });
          const checkData = await checkRes.json();

          const authIntent = typeof window !== "undefined" ? sessionStorage.getItem("matters_auth_intent") : null;
          if (typeof window !== "undefined") sessionStorage.removeItem("matters_auth_intent");

          if (!checkData.registered) {
            if (authIntent === "signup") {
              setEntryStepText("Creating personal FalkorDB tenant graph container...");
              await fetch("/api/auth/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "register",
                  user: {
                    uid: googleUser.uid,
                    email: googleUser.email,
                    displayName: googleUser.displayName || googleUser.email?.split("@")[0] || "User",
                    photoURL: googleUser.photoURL || null,
                  },
                }),
              });
            } else {
              setIsEntering(false);
              try { await firebaseSignOut(auth); } catch {}
              localStorage.removeItem("matters_dev_user");
              setErrorMessage(
                `Google Account (${googleUser.email}) is not registered yet. Please click "Sign Up" below to create an account first.`
              );
              return;
            }
          }

          setEntryStepText("Connecting to FalkorDB Cloud & loading workspace graph...");
          const userProfile = {
            uid: googleUser.uid,
            email: googleUser.email || "",
            displayName: googleUser.displayName || googleUser.email?.split("@")[0] || "User",
            photoURL: googleUser.photoURL || null,
          };
          localStorage.setItem("matters_dev_user", JSON.stringify(userProfile));
          localStorage.removeItem("matters_sandbox_guest");
          const targetUrl = pendingInvite?.project
            ? `/?project=${encodeURIComponent(pendingInvite.project)}`
            : "/";
          router.push(targetUrl);
        }
      } catch (err: any) {
        console.warn("Redirect sign-in notice:", err);
      }
    }
    processRedirectAuth();
  }, [pendingInvite, router]);



  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let googleUser: any = null;

      if (
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "AIzaSyDummyKeyForDevelopment"
      ) {
        // Open Google popup first - do not show modal yet so user chooses email cleanly
        const result = await signInWithPopup(auth, googleProvider);
        googleUser = result.user;
      } else {
        googleUser = {
          uid: "google_verified_user_01",
          email: "user@matters.ai",
          displayName: "Amir Hakim",
          photoURL: null,
        };
      }

      // Show full-screen loading modal AFTER email has been chosen
      setIsEntering(true);
      setEntryStepText("Verifying user account in FalkorDB...");

      // Check if user is registered
      const checkRes = await fetch("/api/auth/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", identifier: googleUser.email }),
      });
      const checkData = await checkRes.json();

      if (!checkData.registered) {
        setIsEntering(false);
        try {
          await firebaseSignOut(auth);
        } catch {}
        localStorage.removeItem("matters_dev_user");
        setErrorMessage(
          `Google Account (${googleUser.email}) is not registered yet. Please click "Sign Up" below to create an account first.`
        );
        return;
      }

      setEntryStepText("Connecting to FalkorDB Cloud & loading workspace graph...");

      const userProfile = {
        uid: googleUser.uid,
        email: googleUser.email || "",
        displayName: googleUser.displayName || googleUser.email?.split("@")[0] || "User",
        photoURL: googleUser.photoURL || null,
      };
      localStorage.setItem("matters_dev_user", JSON.stringify(userProfile));
      localStorage.removeItem("matters_sandbox_guest");
      const targetUrl = pendingInvite?.project
        ? `/?project=${encodeURIComponent(pendingInvite.project)}`
        : "/";
      router.push(targetUrl);
    } catch (err: any) {
      if (
        err?.code === "auth/popup-blocked" ||
        err?.code === "auth/cancelled-popup-request" ||
        err?.message?.toLowerCase().includes("popup")
      ) {
        if (typeof window !== "undefined") sessionStorage.setItem("matters_auth_intent", "signin");
        setIsEntering(true);
        setEntryStepText("Browser popup blocked. Redirecting to Google Sign-In directly...");
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      setIsEntering(false);
      if (err?.code === "auth/popup-closed-by-user") return;
      console.warn("Google sign-in notice:", err);
      setErrorMessage(err?.message || "Google sign-in was interrupted. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let googleUser: any = null;

      if (
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "AIzaSyDummyKeyForDevelopment"
      ) {
        const result = await signInWithPopup(auth, googleProvider);
        googleUser = result.user;
      } else {
        googleUser = {
          uid: "google_verified_user_01",
          email: "user@matters.ai",
          displayName: "Amir Hakim",
          photoURL: null,
        };
      }

      // Register user in system registry
      const regRes = await fetch("/api/auth/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          user: {
            uid: googleUser.uid,
            email: googleUser.email || "",
            displayName: googleUser.displayName || googleUser.email?.split("@")[0] || "User",
            photoURL: googleUser.photoURL || null,
          },
        }),
      });
      const regData = await regRes.json();

      // Sign out from Firebase immediately so user does NOT auto-login
      try {
        await firebaseSignOut(auth);
      } catch {}
      localStorage.removeItem("matters_dev_user");

      if (regData.alreadyRegistered) {
        setActiveTab("signin");
        setSuccessMessage(`Account (${googleUser.email}) is already registered. Please proceed to Sign In.`);
      } else {
        setActiveTab("signin");
        setSuccessMessage(`Registration successful for ${googleUser.email}! Please click "Sign In with Google" to access your workspace.`);
      }
    } catch (err: any) {
      if (
        err?.code === "auth/popup-blocked" ||
        err?.code === "auth/cancelled-popup-request" ||
        err?.message?.toLowerCase().includes("popup")
      ) {
        if (typeof window !== "undefined") sessionStorage.setItem("matters_auth_intent", "signup");
        setIsEntering(true);
        setEntryStepText("Browser popup blocked. Redirecting to Google Sign-Up directly...");
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      if (err?.code === "auth/popup-closed-by-user") return;
      console.warn("Google sign-up notice:", err);
      setErrorMessage(err?.message || "Google sign-up was interrupted. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    setIsEntering(true);
    setEntryStepText("Preparing sandbox environment with 4 demo personas...");
    localStorage.removeItem("matters_dev_user");
    localStorage.setItem("matters_sandbox_guest", "true");
    const targetUrl = pendingInvite?.project
      ? `/?project=${encodeURIComponent(pendingInvite.project)}`
      : "/";
    router.push(targetUrl);
  };


  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-blue-500/20">
      {/* Split-Card Container matching reference design */}
      <div className="max-w-[1020px] w-full bg-white rounded-[24px] shadow-2xl border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        
        {/* SISI KIRI: Rich Dark Navy/Royal Blue Branded Showcase Panel */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#0A192F] via-[#0E2849] to-[#061220] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

          <div>
            {/* Brand Logo & Subtitle */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                M
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white leading-none">
                  Matters
                </h2>
                <p className="text-[11px] text-blue-200/80 mt-1 font-medium">
                  Because what people say, Matters.
                </p>
              </div>
            </div>

            {/* Hackathon Badge */}
            <div className="mt-8">
              <span className="inline-block text-[10px] font-mono tracking-wider uppercase px-2.5 py-1 rounded-[6px] bg-blue-950/70 text-blue-300 border border-blue-500/30 font-semibold">
                FalkorDB Graph Hacks 2026 • Real-Time Agent Memory & Coordination
              </span>
            </div>

            {/* Feature Showcase Box */}
            <div className="mt-8 space-y-4">
              <span className="inline-flex items-center gap-1.5 text-[10.5px] font-mono tracking-wide px-2.5 py-1 rounded bg-blue-900/50 text-blue-300 border border-blue-500/20 font-semibold">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span>{slides[activeSlide].step}</span>
              </span>

              <h1 className="text-2xl sm:text-[26px] font-bold text-white tracking-tight leading-snug">
                {slides[activeSlide].title}
              </h1>

              <p className="text-[12.5px] text-blue-100/75 leading-relaxed">
                {slides[activeSlide].desc}
              </p>

              <div className="pt-2">
                <span className="inline-block text-[10.5px] font-mono text-blue-300 bg-blue-950/80 border border-blue-500/30 px-2.5 py-1 rounded">
                  {slides[activeSlide].tag}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Slider Pagination Dots & Arrows */}
          <div className="pt-8 flex items-center justify-between border-t border-blue-800/40 mt-8">
            <div className="flex items-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    activeSlide === idx
                      ? "w-6 bg-blue-400"
                      : "w-1.5 bg-blue-800 hover:bg-blue-700"
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveSlide((prev) => (prev > 0 ? prev - 1 : slides.length - 1))}
                className="w-7 h-7 rounded-lg bg-blue-900/60 hover:bg-blue-800/80 border border-blue-700/40 flex items-center justify-center text-blue-200 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveSlide((prev) => (prev < slides.length - 1 ? prev + 1 : 0))}
                className="w-7 h-7 rounded-lg bg-blue-900/60 hover:bg-blue-800/80 border border-blue-700/40 flex items-center justify-center text-blue-200 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* SISI KANAN: Clean White Form Card */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between bg-white">
          <div>
            {/* Top Bar: Security Badge + Language */}
            <div className="flex items-center justify-between mb-6">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium text-blue-700 bg-blue-50 border border-blue-200/70 rounded-lg">
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>IDOR Protected Auth</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                <Globe className="w-3 h-3 text-slate-400" />
                <span>EN</span>
              </span>
            </div>

            {/* Notification Banners */}
            {successMessage && (
              <div className="mb-5 p-3.5 rounded-[12px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12.5px] flex items-start gap-2.5 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-emerald-900">Success!</p>
                  <p className="mt-0.5">{successMessage}</p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-[12px] bg-red-50 border border-red-200 text-red-800 text-[12.5px] flex items-start gap-2.5 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900">Access Denied</p>
                  <p className="mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Teammate Invitation Callout */}
            {pendingInvite && (
              <div className="mb-5 p-3.5 rounded-[12px] bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200 text-blue-900 text-[12.5px] flex items-start gap-2.5 shadow-xs animate-in fade-in">
                <span className="text-base leading-none mt-0.5">✉️</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-blue-950">
                      Workspace Invitation: {pendingInvite.project}
                    </p>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-200/70 text-blue-900 font-bold uppercase">
                      Pending
                    </span>
                  </div>
                  <p className="text-[11.5px] text-blue-800 mt-0.5 leading-relaxed">
                    {pendingInvite.inviter ? `Invited by ${pendingInvite.inviter}. ` : ""}
                    Sign in or enter the sandbox below — you will automatically join and access this project without re-clicking any link.
                  </p>
                </div>
              </div>
            )}

            {/* Header Title Section */}

            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>Passwordless Instant Access</span>
              </span>

              <h2 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
                {activeTab === "signin" ? "Sign In to Matters" : "Sign Up for Matters"}
              </h2>

              <p className="text-[13px] text-slate-500 mt-1">
                {activeTab === "signin"
                  ? "Sign in with Google or use one-click instant sandbox demo."
                  : "Sign up with Google to isolate your personal graph container on FalkorDB."}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              {/* Primary Action Button (Google Sign In / Sign Up) */}
              <button
                type="button"
                onClick={activeTab === "signin" ? handleGoogleSignIn : handleGoogleSignUp}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 hover:border-slate-300 rounded-[12px] bg-white hover:bg-slate-50/80 text-[13.5px] font-semibold text-slate-800 transition shadow-xs active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>
                  {loading
                    ? "Connecting to Google..."
                    : activeTab === "signin"
                    ? "Sign In with Google"
                    : "Sign Up with Google"}
                </span>
              </button>

              {/* Secondary Action: Instant Demo Sandbox Button in Royal Blue */}
              <button
                type="button"
                onClick={handleContinueAsGuest}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] bg-blue-50 hover:bg-blue-100/90 border border-blue-200 text-blue-800 text-[13.5px] font-semibold transition active:scale-[0.99] shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Instant Demo Sandbox (4 Personas)</span>
              </button>
            </div>

            {/* Checklist of Features */}
            <div className="mt-7 pt-6 border-t border-slate-100 space-y-2.5 text-[12.5px] text-slate-600">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Automatic bi-temporal Cypher superseding on conflicts</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Isolated personal tenant on FalkorDB Cloud (<code className="font-mono text-[11px] text-slate-800">matters_&lt;uid&gt;</code>)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Context-aware AI assistant with full workspace graph memory</span>
              </div>
            </div>
          </div>

          {/* Bottom Switch between Sign In and Sign Up */}
          <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div>
              {activeTab === "signin" ? (
                <span className="text-slate-500">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("signup");
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="font-semibold text-blue-700 hover:text-blue-800 underline underline-offset-2 ml-1 cursor-pointer"
                  >
                    Sign Up here
                  </button>
                </span>
              ) : (
                <span className="text-slate-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("signin");
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="font-semibold text-blue-700 hover:text-blue-800 underline underline-offset-2 ml-1 cursor-pointer"
                  >
                    Sign In here
                  </button>
                </span>
              )}
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              100% Free • No CC Required
            </div>
          </div>
        </div>

      </div>

      {/* High-Tech Loading Transition Overlay */}
      {isEntering && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="max-w-[420px] w-full bg-white rounded-[24px] shadow-2xl border border-slate-200/80 p-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
            {/* Animated Glowing Ring & Logo */}
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 border-t-blue-600 animate-spin" />
              <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xl flex items-center justify-center shadow-md">
                M
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">
                Initializing Matters Workspace
              </h3>
              <p className="text-[12.5px] text-blue-600 font-medium animate-pulse">
                {entryStepText}
              </p>
            </div>

            {/* High-tech FalkorDB graph sync bar */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full w-2/3 rounded-full animate-pulse" />
              </div>
              <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400">
                <span>FalkorDB Bi-Temporal Sync</span>
                <span className="text-emerald-600 font-semibold">Processing...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xs text-muted">
          Loading portal...
        </div>
      }
    >
      <LoginContent />
    </React.Suspense>
  );
}
