"use client"

import { signIn, signOut } from "next-auth/react"
import { useTransition } from "react"


export function GoogleSignInButton() {
  const [pending, start] = useTransition()

  return (
    <button
      onClick={()=> signIn("google", { callbackUrl: '/#register' })}
      className="inline-flex cursor-pointer items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      disabled={pending}
      aria-label="Sign in with Google"
    >
      {pending ? "Signing in..." : "Sign in with Google"}
    </button>
  )
}

export function SignOutButton() {
  const [pending, start] = useTransition()
  return (
    <button
      onClick={() => start(async () => { try { localStorage.removeItem('sih-reg-state-v1') } catch {}; await signOut(); })}
      className="inline-flex items-center justify-center rounded-md border px-4 py-2 whitespace-nowrap hover:bg-gray-50 disabled:opacity-50"
      disabled={pending}
      aria-label="Sign out"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  )
}
