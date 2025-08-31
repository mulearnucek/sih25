import RegistrationForm from "@/components/registration-form"

export default function Page() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <header className="w-full border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-blue-600" aria-hidden />
            <span className="font-semibold">SIH Internals (UCEK)</span>
          </div>
          <a href="#register" className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">
            Register
          </a>
        </div>
      </header>

      <section id="register" className="px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <h1 className="text-pretty text-3xl font-semibold leading-9">Smart India Hackathon – Internals (UCEK)</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Register your participation, create or join a team with a unique invite code, and receive email
              confirmation. Teams must have exactly 6 members with at least one female participant.
            </p>
          </div>

          <RegistrationForm />
        </div>
      </section>

      <footer className="mt-12 border-t">
        <div className="mx-auto max-w-4xl px-4 py-6 text-sm text-gray-600">
          © {new Date().getFullYear()} UCEK • Smart India Hackathon Internals
        </div>
      </footer>
    </main>
  )
}
