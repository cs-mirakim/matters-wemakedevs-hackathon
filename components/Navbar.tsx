"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { LogIn, UserPlus, LogOut, Trash2, ChevronDown, User, Shield } from "lucide-react";

interface NavbarProps {
  userEmail?: string | null;
  userName?: string | null;
  photoURL?: string | null;
  graphName?: string;
  isLoggedIn?: boolean;
  isGuest?: boolean;
  onSignIn?: () => void;
  onSignUp?: () => void;
  onSignOut?: () => void;
  onDeleteAccount?: () => void;
  onExitSandbox?: () => void;
}

export default function Navbar({
  userEmail,
  userName = "User",
  photoURL,
  graphName = "matters_user",
  isLoggedIn = false,
  isGuest = false,
  onSignIn,
  onSignUp,
  onSignOut,
  onDeleteAccount,
  onExitSandbox,
}: NavbarProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="w-full px-4 sm:px-5 lg:px-6 h-[64px] flex items-center justify-between bg-white">
        {/* Logo & Tagline */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
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
          </Link>
        </div>

        {/* Right Header Navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* FalkorDB Graph Engine Indicator */}
          <div className="hidden md:flex items-center gap-2 h-[34px] px-3 rounded-[8px] bg-subtle border border-border text-[12px] text-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
            <span>FalkorDB Graph</span>
            <span className="text-border">|</span>
            <span className="font-mono text-[11px] font-semibold text-foreground" suppressHydrationWarning>
              {graphName}
            </span>
          </div>

          {/* Auth Session Section */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 h-[36px] px-2.5 rounded-[9px] hover:bg-subtle border border-transparent hover:border-border transition active:scale-[0.99]"
                >
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt={userName || "Profile"}
                      className="w-7 h-7 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary-soft text-primary border border-primary/20 flex items-center justify-center text-[11px] font-bold">
                      {userName ? userName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                    </div>
                  )}

                  <div className="hidden sm:block text-left">
                    <p className="text-[12px] font-semibold text-foreground leading-none" suppressHydrationWarning>
                      {userName || "User"}
                    </p>
                    <p className="text-[10px] text-muted leading-none mt-1 truncate max-w-[130px]" suppressHydrationWarning>
                      {userEmail}
                    </p>
                  </div>

                  <ChevronDown className="w-3.5 h-3.5 text-muted ml-0.5" />
                </button>

                {/* Profile Dropdown Menu */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-60 bg-white border border-border rounded-[12px] shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-2.5 border-b border-border/70">
                      <p className="text-[13px] font-semibold text-foreground truncate">
                        {userName}
                      </p>
                      <p className="text-[11px] text-muted truncate mt-0.5">
                        {userEmail}
                      </p>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          if (onDeleteAccount) onDeleteAccount();
                        }}
                        className="w-full px-3.5 py-2 text-left text-[12px] text-red-600 hover:bg-red-50 flex items-center gap-2 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        <span>Delete Account</span>
                      </button>

                      <div className="my-1 border-t border-border/60" />

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          if (onSignOut) onSignOut();
                        }}
                        className="w-full px-3.5 py-2 text-left text-[12px] text-foreground hover:bg-subtle flex items-center gap-2 transition"
                      >
                        <LogOut className="w-3.5 h-3.5 text-muted" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : isGuest ? (
              <button
                type="button"
                onClick={onExitSandbox}
                className="inline-flex items-center gap-1.5 h-[34px] px-3.5 text-[12px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-[8px] transition active:scale-[0.99] shadow-2xs cursor-pointer"
                title="Keluar dari Sandbox Mode"
              >
                <LogOut className="w-3.5 h-3.5 text-amber-700" />
                <span>Exit Sandbox Mode</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSignIn}
                  className="inline-flex items-center gap-1.5 h-[34px] px-3.5 text-[12px] font-medium text-foreground bg-white hover:bg-subtle border border-border rounded-[8px] transition active:scale-[0.99] shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5 text-primary" />
                  <span>Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={onSignUp}
                  className="inline-flex items-center gap-1.5 h-[34px] px-3.5 text-[12px] font-medium text-white bg-primary hover:bg-primary-hover rounded-[8px] transition active:scale-[0.99] shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
