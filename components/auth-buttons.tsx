"use client"

import { useTransition } from "react"

export function GoogleSignInButton() {
  const [pending, start] = useTransition()

  return (
    <button
      onClick={() =>
        start(async () => {
          // Redirect to NextAuth sign-in with Google
          window.location.href = "/api/auth/signin?provider=google"
        })
      }
      className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
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
      onClick={() => start(() => (window.location.href = "/api/auth/signout"))}
      className="inline-flex items-center justify-center rounded-md border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
      disabled={pending}
      aria-label="Sign out"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  )
}
