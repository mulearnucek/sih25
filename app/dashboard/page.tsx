"use client";
import { auth, authOptions } from "@/lib/auth"
import BroadcastForm from "@/components/broadcast-form"
import { getServerSession } from "next-auth"
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

function isAdmin(email?: string | null) {
  const admins = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return email && admins.includes(email.toLowerCase())
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [participants, setParticipants] = useState([])
  const [teams, setTeams] = useState([])

  const email = session?.user?.email

  useEffect(() => {
   async function getData() {
      const [pRes, tRes] = await Promise.all([
        fetch("/api/dashboard/participants", { cache: "no-store" }),
        fetch("/api/dashboard/teams", { cache: "no-store" }),
      ])
      const participants = pRes.ok ? (await pRes.json()).participants : []
      const teams = tRes.ok ? (await tRes.json()).teams : []
      setParticipants(participants)
      setTeams(teams)
    }
    getData()
  }, [])


    if (!isAdmin(email)) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-gray-600">You do not have access to this page.</p>
        <a className="mt-4 inline-block rounded-md border px-3 py-2 text-sm hover:bg-gray-50" href="/">
          Go back
        </a>
      </main>
    )
  }
  
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <a href="/api/dashboard/export" className="rounded-md bg-amber-500 px-4 py-2 text-white hover:bg-amber-600">
          Export XLSX
        </a>
      </header>

      <section className="mb-8 rounded-md border p-4">
        <h2 className="mb-3 text-lg font-semibold">Broadcast Email</h2>
        <BroadcastForm />
      </section>

      <section className="mb-8 rounded-md border p-4">
        <h2 className="mb-3 text-lg font-semibold">Participants ({participants.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="border-b px-3 py-2">Name</th>
                <th className="border-b px-3 py-2">Email</th>
                <th className="border-b px-3 py-2">Gender</th>
                <th className="border-b px-3 py-2">Phone</th>
                <th className="border-b px-3 py-2">College</th>
                <th className="border-b px-3 py-2">Year</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p: any) => (
                <tr key={p.email}>
                  <td className="border-b px-3 py-2">{p.name}</td>
                  <td className="border-b px-3 py-2">{p.email}</td>
                  <td className="border-b px-3 py-2 capitalize">{p.gender}</td>
                  <td className="border-b px-3 py-2">{p.fields?.phone || ""}</td>
                  <td className="border-b px-3 py-2">{p.fields?.college || ""}</td>
                  <td className="border-b px-3 py-2">{p.fields?.year || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8 rounded-md border p-4">
        <h2 className="mb-3 text-lg font-semibold">Teams ({teams.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="border-b px-3 py-2">Team Name</th>
                <th className="border-b px-3 py-2">Invite Code</th>
                <th className="border-b px-3 py-2">Leader</th>
                <th className="border-b px-3 py-2">Members Count</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t: any) => (
                <tr key={t.name}>
                  <td className="border-b px-3 py-2">{t.name}</td>
                  <td className="border-b px-3 py-2 font-mono">{t.inviteCode}</td>
                  <td className="border-b px-3 py-2">{t.leaderUserId}</td>
                  <td className="border-b px-3 py-2">{t.memberUserIds?.length || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
