"use client"

import type React from "react"

import useSWR from "swr"
import { useEffect, useMemo, useState, useTransition } from "react"
import { DynamicField } from "./dynamic-field"
import { GoogleSignInButton, SignOutButton } from "./auth-buttons"

type Schema = {
  title: string
  description?: string
  fields: {
    key: string
    label: string
    type: "text" | "select"
    required?: boolean
    options?: string[]
    placeholder?: string
  }[]
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function RegistrationForm() {
  const [schema, setSchema] = useState<Schema | null>(null)
  const { data: me, mutate: mutateMe } = useSWR("/api/participant", fetcher)
  const [form, setForm] = useState<Record<string, string>>({})
  const [teamMode, setTeamMode] = useState<"none" | "create" | "join">("none")
  const [teamName, setTeamName] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [pending, start] = useTransition()
  const sessionEmail = me?.sessionUser?.email as string | undefined

  useEffect(() => {
    import("../app/data/registration-schema.json").then((m) => setSchema(m as any))
  }, [])

  useEffect(() => {
    if (me?.participant?.fields) {
      setForm(me.participant.fields)
    }
  }, [me?.participant])

  const fieldsToRender = useMemo(() => {
    return schema?.fields || []
  }, [schema])

  function updateField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sessionEmail) {
      alert("Please sign in with Google first.")
      return
    }
    start(async () => {
      const r1 = await fetch("/api/participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: form }),
      })
      const j1 = await r1.json()
      if (!r1.ok) {
        alert(j1.error || "Failed to register")
        return
      }

      if (teamMode === "create" && teamName) {
        const r2 = await fetch("/api/team/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: teamName.trim() }),
        })
        const j2 = await r2.json()
        if (!r2.ok) {
          alert(j2.error || "Failed to create team")
          return
        } else {
          alert(`Team created! Invite code: ${j2.inviteCode}`)
        }
      } else if (teamMode === "join" && inviteCode) {
        const r3 = await fetch("/api/team/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
        })
        const j3 = await r3.json()
        if (!r3.ok) {
          alert(j3.error || "Failed to join team")
          return
        } else {
          alert("Joined team successfully!")
        }
      }

      mutateMe()
      alert("Registration saved. A confirmation email has been sent if this is your first time.")
    })
  }

  return (
    <div className="w-full max-w-xl mx-auto rounded-lg border bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-balance">{schema?.title || "Registration"}</h2>
        {schema?.description ? <p className="text-sm text-gray-600 mt-1">{schema.description}</p> : null}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          {sessionEmail ? (
            <span>
              Signed in as <span className="font-medium">{sessionEmail}</span>
            </span>
          ) : (
            <span>Please sign in with Google</span>
          )}
        </div>
        {sessionEmail ? <SignOutButton /> : <GoogleSignInButton />}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Email (from Google)</label>
          <input
            value={sessionEmail || ""}
            disabled
            aria-readonly
            className="rounded-md border bg-gray-50 px-3 py-2 text-gray-700"
          />
        </div>

        {fieldsToRender.map((f) => (
          <DynamicField key={f.key} field={f} value={form[f.key] || ""} onChange={updateField} />
        ))}

        <div className="mt-2 rounded-md border p-4">
          <p className="text-sm font-medium text-gray-800 mb-2">Team Options</p>
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="teamMode"
                value="none"
                checked={teamMode === "none"}
                onChange={() => setTeamMode("none")}
              />
              <span>No team action</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="teamMode"
                value="create"
                checked={teamMode === "create"}
                onChange={() => setTeamMode("create")}
              />
              <span>Create new team (leader)</span>
            </label>
            {teamMode === "create" && (
              <input
                className="rounded-md border px-3 py-2"
                placeholder="Team Name (unique)"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            )}
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="teamMode"
                value="join"
                checked={teamMode === "join"}
                onChange={() => setTeamMode("join")}
              />
              <span>Join with invite code</span>
            </label>
            {teamMode === "join" && (
              <input
                className="rounded-md border px-3 py-2 uppercase"
                placeholder="Invite Code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              />
            )}
            <p className="text-xs text-gray-600 mt-1">
              Constraints: Team must have exactly 6 members and include at least 1 female member.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending || !sessionEmail}
          className="mt-2 inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Submit Registration"}
        </button>
      </form>
    </div>
  )
}
