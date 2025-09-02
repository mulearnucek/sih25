"use client";

import type React from "react";

import useSWR from "swr";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { DynamicField } from "./dynamic-field";
import { GoogleSignInButton, SignOutButton } from "./auth-buttons";
import { signIn } from "next-auth/react";
import confetti from "canvas-confetti";

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "select";
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

type SectionDef = {
  id: string;
  title: string;
  description?: string;
  fields: FieldDef[];
};

type Schema = {
  title: string;
  description?: string;
  fields?: FieldDef[]; // backward compatibility
  sections?: SectionDef[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function RegistrationForm() {
  const [schema, setSchema] = useState<Schema | null>(null);
  const { data: me, mutate: mutateMe, error: meError, isLoading: loadingMeRaw } = useSWR(() => "/api/participant", fetcher);
  const [form, setForm] = useState<Record<string, string>>({});
  const [teamMode, setTeamMode] = useState<"create" | "join">("create");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [pending, start] = useTransition();
  const sessionEmail = me?.sessionUser?.email as string | undefined;
  const [showCongrats, setShowCongrats] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  // WhatsApp community prompt visibility
  const [showWhatsAppPrompt, setShowWhatsAppPrompt] = useState(true);
  // Secondary prompt after team completion
  const [showWhatsAppTeamPrompt, setShowWhatsAppTeamPrompt] = useState(true);
  const LOCAL_KEY = "sih-reg-state-v1";

  useEffect(() => {
    import("../app/data/registration-schema.json").then((m) =>
      setSchema(m as any)
    );
  }, []);

  useEffect(() => {
    if (me?.participant?.fields) {
      setForm((prev) => ({ ...prev, ...me.participant.fields }));
    }
  }, [me?.participant]);

  // ...existing code...

  // Move this effect below totalSteps declaration

  // Restore local state (before sign-in allowed only limited restoration)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.form) setForm(parsed.form);
        if (typeof parsed.step === "number") setCurrentStep(parsed.step);
        if (parsed.teamMode)
          setTeamMode(parsed.teamMode === "none" ? "create" : parsed.teamMode);
        if (parsed.teamName) setTeamName(parsed.teamName);
        if (parsed.inviteCode) setInviteCode(parsed.inviteCode);
      }
    } catch {}
  }, []);

  // Persist state
  useEffect(() => {
    const data = { form, step: currentStep, teamMode, teamName, inviteCode };
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    } catch {}
  }, [form, currentStep, teamMode, teamName, inviteCode]);

  const sections = useMemo<SectionDef[]>(() => {
    if (!schema) return [];
    if (schema.sections && schema.sections.length) return schema.sections;
    if (schema.fields && schema.fields.length) {
      return [
        {
          id: "main",
          title: "Details",
          description: "Provide required details",
          fields: schema.fields,
        },
      ];
    }
    return [];
  }, [schema]);

  const totalSteps = 1 /* sign-in */ + sections.length + 1; /* team formation */

  // ...existing code...

  function updateField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, totalSteps - 1));
  }, [totalSteps]);
  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  async function saveParticipant() {
    if (!sessionEmail) return;
    const r1 = await fetch("/api/participant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: form }),
    });
    if (!r1.ok) {
      const j = await r1.json().catch(() => ({}));
      setError(j.error || "Failed to save participant");
      return false;
    }
    setError(null);
    mutateMe();
    return true;
  }

  const { data: teamStatus, mutate: mutateTeam, isLoading: loadingTeamRaw } = useSWR(
    sessionEmail ? "/api/team/status" : null,
    fetcher,
    { refreshInterval: 8000 }
  );

  useEffect(() => {
    // Jump to team view if user has a team (this overrides localStorage restoration)
    if (teamStatus?.team && sessionEmail) {
      setCurrentStep(totalSteps - 1);
    }
  }, [teamStatus?.team, sessionEmail, totalSteps]);

  // Override localStorage step restoration if user has a team
  useEffect(() => {
    if (teamStatus?.team) {
      // If user has a team, force them to team view regardless of localStorage
      setCurrentStep(totalSteps - 1);
    } else {
      // Only restore from localStorage if user doesn't have a team
      try {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.step === "number") {
            setCurrentStep(parsed.step);
          }
        }
      } catch {}
    }
  }, [teamStatus, totalSteps]);
  const loadingParticipant = (typeof loadingMeRaw === 'boolean' ? loadingMeRaw : (!me && !meError));
  const loadingTeam = (typeof loadingTeamRaw === 'boolean' ? loadingTeamRaw : (sessionEmail && !teamStatus));
  const isLeader = !!teamStatus?.team && teamStatus.team.leaderUserId === sessionEmail;

  async function submitTeamActions() {
    setError(null);
    if (teamMode === "create") {
      if (!teamName.trim()) {
        setError("Team name is required");
        return false;
      }
      const r2 = await fetch("/api/team/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim() }),
      });
      const j2 = await r2.json();
      if (!r2.ok) {
        setError(j2.error || "Failed to create team");
        return false;
      }
      setInfo("Team created successfully! 🎉");
      // Trigger confetti for team creation
      setTimeout(() => {
        try {
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } }), 150);
          setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } }), 300);
        } catch {}
      }, 100);
      await mutateTeam();
    } else if (teamMode === "join") {
      if (!inviteCode.trim()) {
        setError("Invite code required");
        return false;
      }
      const r3 = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
      });
      const j3 = await r3.json();
      if (!r3.ok) {
        setError(j3.error || "Failed to join team");
        return false;
      }
      setInfo("Joined team successfully! 🎉");
      // Trigger confetti for team joining
      setTimeout(() => {
        try {
          confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } }), 150);
          setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } }), 300);
        } catch {}
      }, 100);
      await mutateTeam();
    }
    await mutateTeam();
    return true;
  }

  async function handlePrimary(e: React.FormEvent) {
    e.preventDefault();
    if (currentStep === 0) {
      if (!sessionEmail) {
        return;
      }
      goNext();
      return;
    }
    // field steps
    const fieldStepsEndIndex = 1 + sections.length - 1;
    if (currentStep >= 1 && currentStep <= fieldStepsEndIndex) {
      if (!sessionEmail) {
        setError("Sign in required");
        return;
      }
      start(async () => {
        const ok = await saveParticipant();
        if (ok) goNext();
      });
      return;
    }
    // team formation step
    if (currentStep === totalSteps - 1) {
      start(async () => {
        const ok1 = await saveParticipant();
        if (!ok1) return;
        const ok2 = await submitTeamActions();
        if (!ok2) return;
        setShowCongrats(true);
        goNext();
      });
    }
  }

  const progressPercent = (currentStep / (totalSteps - 1)) * 100;

  const fieldStepsStart = 1;
  const fieldStepsEnd = fieldStepsStart + sections.length - 1;

  const isTeamStep = currentStep === totalSteps - 1;
  const isDone = showCongrats && currentStep === totalSteps && (teamStatus.members?.length || 1) >= 6 ;
  const teamLocked = isTeamStep && !!teamStatus?.team;

  // Persist / restore dismissal of WhatsApp prompt
  useEffect(() => {
    try {
      if (localStorage.getItem('sih-wa-dismissed') === '1') {
        setShowWhatsAppPrompt(false);
      }
      if (localStorage.getItem('sih-wa-dismissed-team') === '1') {
        setShowWhatsAppTeamPrompt(false);
      }
    } catch {}
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {schema?.title || "Registration"}
          </h2>
          {schema?.description ? (
            <p className="mt-1 text-xs text-slate-600 max-w-sm">
              {schema.description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600">
          {sessionEmail && (
            <>
              <span className="hidden sm:inline">{sessionEmail}</span>
              <SignOutButton />
            </>
          )}
          {!sessionEmail && currentStep > 0 && <GoogleSignInButton />}
        </div>
      </div>
      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <form onSubmit={handlePrimary} className="flex flex-col gap-5">
        {/* Inline feedback messages */}
        {error && (
          <div className="animate-in fade-in rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <div className="flex-1">{error}</div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-600/70 hover:text-red-700 text-[10px] font-medium"
            >
              Dismiss
            </button>
          </div>
        )}
        {info && !error && (
          <div className="animate-in fade-in rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 flex items-start gap-2">
            <span className="mt-0.5">✅</span>
            <div className="flex-1">{info}</div>
            <button
              type="button"
              onClick={() => setInfo(null)}
              className="text-emerald-600/70 hover:text-emerald-700 text-[10px] font-medium"
            >
              Dismiss
            </button>
          </div>
        )}
  {!error && loadingParticipant && currentStep > 0 && (
          <div
            className="animate-in fade-in rounded-md border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600 flex items-center gap-2"
            role="status"
            aria-live="polite"
          >
            <svg
              className="h-4 w-4 animate-spin text-indigo-600"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            Loading your saved data...
          </div>
        )}
        {/* Step content */}
        {currentStep === 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <p className="text-sm text-slate-600">
              Sign in with Google to begin your registration.
            </p>
            {!sessionEmail && (
              <div className="flex justify-center">
                <GoogleSignInButton />
              </div>
            )}
            {sessionEmail && (
              <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-700">
                Signed in as <span className="font-medium">{sessionEmail}</span>
              </div>
            )}
            {!sessionEmail && (
              <p className="text-xs text-amber-600 text-center">
                You must sign in to continue.
              </p>
            )}
          </div>
        )}

        {currentStep >= fieldStepsStart && currentStep <= fieldStepsEnd && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {(() => {
              const section = sections[currentStep - fieldStepsStart];
              if (!section) return null;
              return (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">
                      {section.title}
                    </p>
                    {section.description && (
                      <p className="text-xs text-slate-500">
                        {section.description}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-5">
                    {section.fields.map((f) => (
                      <DynamicField
                        key={f.key}
                        field={f}
                        value={form[f.key] || ""}
                        onChange={updateField}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {isTeamStep && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">
                Team Formation
              </p>
              <p className="text-xs text-slate-500">
                Create a new team or join using an invite code. This step is
                required.
              </p>
            </div>
            {loadingTeam && (
              <div className="rounded-lg border border-dashed p-6 flex flex-col items-center justify-center gap-3 bg-white/60">
                <svg className="h-6 w-6 animate-spin text-indigo-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <p className="text-xs text-slate-600">Loading team status...</p>
              </div>
            )}
            {!loadingTeam && teamStatus?.team ? (
              <div className="rounded-lg border p-4 bg-gradient-to-br from-indigo-50 to-blue-50">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700">Your Team</h3>
                    <div className="flex items-center gap-2">
                      {isLeader ? (
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm("Delete this team? This cannot be undone.")) {
                              await fetch("/api/team/status", { method: "DELETE" });
                              setTeamMode("create");
                              setTeamName("");
                              setInviteCode("");
                              await mutateTeam();
                            }
                          }}
                          className="text-[11px] rounded-md border px-2 py-1 cursor-pointer text-white bg-red-500"
                        >
                          Delete Team
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm("Exit this team?")) {
                              const r = await fetch("/api/team/leave", { method: "POST" });
                              if (r.ok) {
                                setInfo("Exited team");
                                await mutateTeam();
                              } else {
                                setError("Failed to exit team");
                              }
                            }
                          }}
                          className="text-[11px] rounded-md border px-2 py-1 cursor-pointer text-white bg-amber-500"
                        >
                          Exit Team
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">
                    <span className="font-medium">Name:</span>{" "}
                    {teamStatus.team.name}
                  </p>
                  {/* Only show invite code if team is not full (less than 6 members) */}
                  {(teamStatus.members?.length || 1) < 6 && (
                    <div className="mt-1 rounded-md border bg-white/70 p-3 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-slate-700">Invite Code</span>
                        <button type="button" onClick={async ()=>{ try { await navigator.clipboard.writeText(teamStatus.team.inviteCode); setCopied(true); setInfo('Invite code copied'); setTimeout(()=>setCopied(false),1500);} catch { setError('Failed to copy code')} }} className="text-[10px] rounded border px-2 py-0.5 hover:bg-indigo-50 border-indigo-300 text-indigo-600">{copied ? 'Copied' : 'Copy'}</button>
                      </div>
                      <div className="font-mono tracking-wider text-center text-sm text-indigo-700 select-all">{teamStatus.team.inviteCode}</div>
                    </div>
                  )}
                  {/* Show team full message when team has 6 members */}
                  {(teamStatus.members?.length || 1) >= 6 && (
                    <div className="mt-1 rounded-md border border-green-200 bg-green-50 p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="text-[11px] font-medium text-green-700">Team Complete</span>
                      </div>
                      <p className="text-[10px] text-green-600 mt-1">Your team has reached the maximum capacity of 6 members.</p>
                      
                      {/* Problem Statement Link */}
                      <div className="mt-3 pt-2 border-t border-green-200">
                        <p className="text-[10px] text-green-700 font-medium mb-2">🚀 Next Step: Choose Your Problem Statement</p>
                        <a 
                          href="https://sih.gov.in/sih2025PS" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View SIH 2025 Problem Statements
                        </a>
                        <p className="text-[9px] text-green-600 mt-1">Browse official problem statements for Smart India Hackathon 2025</p>
                      </div>

                      {/* WhatsApp community prompt after team completion */}
                        <div className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold text-emerald-800">Stay Connected</p>
                              <p className="text-[10px] text-emerald-700 mt-1 leading-relaxed max-w-sm">Join our WhatsApp community for critical updates, resources, and coordination tips as you prepare your submission.</p>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <a
                              href="https://chat.whatsapp.com/F9cJqS4W0YiHFi6naaqrok"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-medium px-3 py-1.5"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2a10 10 0 00-8.94 14.5L2 22l5.7-1.99A10 10 0 1012 2zm0 2a8 8 0 110 16 7.96 7.96 0 01-3.65-.88l-.26-.14-3.38 1.18 1.16-3.3-.17-.28A8 8 0 0112 4zm4.24 9.71c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.18-.7-.62-1.18-1.38-1.32-1.62-.14-.24-.02-.36.1-.48.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.42-.54-.42-.14 0-.3 0-.46 0-.16 0-.42.06-.64.3-.22.24-.86.84-.86 2.04 0 1.2.88 2.36 1 2.52.12.16 1.72 2.62 4.16 3.68.58.26 1.04.42 1.4.54.58.18 1.1.16 1.52.1.46-.06 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" />
                              </svg>
                              Join WhatsApp Group
                            </a>
                          </div>
                        </div>
                    </div>
                  )}
                  <div className="mt-2">
                    <p className="text-[11px] font-medium text-slate-600 mb-1">
                      Members ({teamStatus.members?.length || 1}/6)
                    </p>
                    <ul className="space-y-1">
                      {(teamStatus.members || [])
                        .sort((a: any, b: any) => {
                          // Sort so leader appears first
                          const aIsLeader = teamStatus.team.leaderUserId === a.email;
                          const bIsLeader = teamStatus.team.leaderUserId === b.email;
                          if (aIsLeader && !bIsLeader) return -1;
                          if (!aIsLeader && bIsLeader) return 1;
                          return 0;
                        })
                        .map((m: any) => {
                        const leader = teamStatus.team.leaderUserId === m.email;
                        return (
                          <li
                            key={m.email}
                            className="text-[11px] flex flex-col sm:flex-row sm:items-center sm:justify-between rounded bg-white/70 px-2 py-2 border gap-1 sm:gap-0"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-medium truncate max-w-[10rem] sm:max-w-[14rem]">{m.name}</span>
                              {leader && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-600 text-white whitespace-nowrap">Team Lead</span>
                              )}
                            </div>
                            <span className="uppercase text-[10px] text-slate-500 tracking-wide">
                              {m.gender}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (!loadingTeam && (
              <div className="space-y-4">
                {showWhatsAppPrompt && (
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 space-y-3 animate-in fade-in">
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Join Our WhatsApp Community</p>
                      <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                        Stay updated with announcements, resources, and networking opportunities for SIH 2025 participants while you form your team.
                      </p>
                    </div>
                    <a
                      href="https://chat.whatsapp.com/F9cJqS4W0YiHFi6naaqrok"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-fit items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-4 py-2 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2a10 10 0 00-8.94 14.5L2 22l5.7-1.99A10 10 0 1012 2zm0 2a8 8 0 110 16 7.96 7.96 0 01-3.65-.88l-.26-.14-3.38 1.18 1.16-3.3-.17-.28A8 8 0 0112 4zm4.24 9.71c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.18-.7-.62-1.18-1.38-1.32-1.62-.14-.24-.02-.36.1-.48.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.42-.54-.42-.14 0-.3 0-.46 0-.16 0-.42.06-.64.3-.22.24-.86.84-.86 2.04 0 1.2.88 2.36 1 2.52.12.16 1.72 2.62 4.16 3.68.58.26 1.04.42 1.4.54.58.18 1.1.16 1.52.1.46-.06 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" />
                      </svg>
                      Join WhatsApp Group
                    </a>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setTeamMode("create")}
                  className={`group relative rounded-xl border p-4 text-left transition hover:shadow ${teamMode === "create" ? "border-blue-600 ring-2 ring-blue-600" : "border-slate-200"}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">
                      Create Team
                    </span>
                    <span className="text-xs text-blue-600">Leader</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Start a new team as leader & share code.
                  </p>
                  {teamMode === "create" && (
                    <div className="mt-3">
                      <input
                        className="w-full rounded-md border px-3 py-2 text-sm"
                        placeholder="Team Name"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                      />
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setTeamMode("join")}
                  className={`group relative rounded-xl border p-4 text-left transition hover:shadow ${teamMode === "join" ? "border-blue-600 ring-2 ring-blue-600" : "border-slate-200"}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">
                      Join Team
                    </span>
                    <span className="text-xs text-indigo-600">Member</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Use an invite code from a leader.
                  </p>
                  {teamMode === "join" && (
                    <div className="mt-3">
                      <input
                        className="w-full rounded-md border px-3 py-2 text-sm uppercase tracking-wider"
                        placeholder="Invite Code"
                        value={inviteCode}
                        onChange={(e) =>
                          setInviteCode(e.target.value.toUpperCase())
                        }
                      />
                    </div>
                  )}
                </button>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Teams must have exactly 6 members and include at least 1 female
              participant.
            </p>
          </div>
        )}

        {isDone && (
          <div
            className="animate-in fade-in-50 slide-in-from-bottom-1 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
            role="status"
            aria-live="polite"
          >
            Registration complete. You can revisit to modify details before the
            deadline.
          </div>
        )}

        {/* Navigation Buttons (hidden if team already formed) */}
        {!isDone && !teamLocked && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={currentStep === 0 || pending}
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
            >
              Back
            </button>
            <div className="ml-auto flex items-center gap-4 text-[11px] text-slate-500">
              <span>
                Step {Math.min(currentStep + 1, totalSteps)} / {totalSteps}
              </span>
            </div>
            {sessionEmail != null && <button
              type="submit"
              disabled={
                pending ||
                (currentStep === 0 && !sessionEmail) ||
                (isTeamStep && teamMode === "create" && !teamName.trim()) ||
                (isTeamStep && teamMode === "join" && !inviteCode.trim())
              }
              className="inline-flex items-center rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow hover:from-blue-500 hover:to-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"
            >
              {currentStep === 0 && !sessionEmail
                ? null
                : pending
                  ? "Saving..."
                  : currentStep === totalSteps - 1
                    ? "Finish"
                    : "Continue"}
            </button>}
          </div>
        )}
      </form>
    </div>
  );
}
