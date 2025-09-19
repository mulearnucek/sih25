import RegistrationForm from "@/components/registration-form"
import Image from "next/image"

export default function Page() {
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-white via-slate-50 to-blue-50 text-gray-900 selection:bg-blue-600/90 selection:text-white">
      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
        {/* subtle animated grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.15] [mask-image:radial-gradient(circle_at_center,black,transparent)]">
          <div className="animate-[grid-move_12s_linear_infinite] h-full w-full bg-[linear-gradient(to_right,#0a3a9a11_1px,transparent_1px),linear-gradient(to_bottom,#0a3a9a11_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>
        {/* floating orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 left-1/4 h-60 w-60 animate-pulse rounded-full bg-blue-300/20 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-72 w-72 animate-pulse delay-1000 rounded-full bg-indigo-300/20 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center">
          <div>
            <Image src="/banner2.png" alt="SIH 2025" width={500} height={120} priority className="drop-shadow-sm mb-5 mt-5 sm:mt-0" />
          </div>
          {/* <div className="group relative mb-10 inline-flex items-center justify-center">
            <div className="absolute inset-0 animate-spin-slow rounded-full bg-[conic-gradient(var(--tw-gradient-stops))] from-blue-500 via-indigo-500 to-blue-500 opacity-40 blur-md" />
            <div className="relative flex h-40 w-40 items-center justify-center rounded-2xl border border-blue-500/20 bg-white/70 backdrop-blur-xl shadow-lg shadow-blue-500/10">
              <Image src="/logo.png" alt="SIH 2025" width={120} height={120} priority className="drop-shadow-sm" />
            </div>
          </div> */}
          <h1 className="text-balance bg-gradient-to-br from-slate-900 via-blue-800 to-indigo-700 bg-clip-text text-4xl font-bold leading-tight tracking-tight text-transparent sm:text-5xl md:text-6xl">
            Smart India Hackathon 2025
          </h1>
          <h2 className="text-xl">University College of Engineering, Kariavattom - Internal Selection</h2>
          <p className="mt-6 max-w-2xl text-pretty text-sm leading-relaxed text-slate-600 sm:text-base md:text-lg">
            UCEK's internal selection for the nationwide innovation marathon. Ideate, build and collaborate to secure
            your spot. Form diverse teams, showcase creativity and solve real-world challenges.
          </p>
          <div className="mt-3 sm:mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-8 animate-in fade-in slide-in-from-bottom-4 [animation-delay:200ms]">
            {PARTNERS.map((p) => (
              <div key={p.name} className="flex items-center">
                <Image src={p.logo} alt={p.name} width={44} height={44} className="h-20 w-20 sm:h-24 sm:w-24 object-contain" />
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 md:block">
          <span className="text-sm uppercase tracking-wider text-slate-500">Scroll</span>
        </div>
      </section>

      {/* Registration Section */}
      <section id="register" className="relative flex min-h-screen items-start justify-center px-4 py-16 sm:py-20">
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col-reverse gap-12 md:flex-row md:items-start">
          <div className="mx-auto w-full max-w-xl pb-12 md:pb-0">
            <RegistrationForm />
          </div>
          <div className="mx-auto max-w-md text-sm text-slate-600 md:sticky md:top-24">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">SIH 2025 Internals Process</h2>
            <ol className="space-y-3 [counter-reset:step]">
              {[
                'Individual Registration (closes on 15 Sept)',
                'Form a Team of 6 members (atleast 1 female team member) - Use Team Discovery from registration to find teammates!',
                'Select Problem Statement - Choose a problem statement from SIH',
                'Kickoff & Mentorship - Meet your team & assigned mentor',
                'Idea Development - Guided sessions + mentor support',
                'Final Pitching (Ideathon) - Pitch your solution & get shortlisted for next level of SIH'
              ].map(txt => (
                <li key={txt} className="relative pl-7 text-slate-600 before:absolute before:left-0 before:top-0 before:flex before:h-5 before:w-5 before:items-center before:justify-center before:rounded-full before:border before:border-blue-500/40 before:bg-white before:text-[10px] before:font-semibold before:text-blue-700 before:content-[counter(step)] [counter-increment:step]">
                  {txt}
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08),transparent_60%)]" />
      </section>

      <footer className="border-t mx-auto flex-col text-xs text-slate-500 sm:flex-row px-6 py-6 bg-white/70 backdrop-blur flex items-center justify-between gap-3">
        <div>
          Smart India Hackathon '25 Internals
        </div>
          University College of Engineering, Kariavattom
        <div>
          Made with 💖 by <a href="https://mulearn.uck.ac.in">μlearn UCEK</a>
        </div>
      </footer>
    </main>
  )
}

const PARTNERS = [
  { name: 'Partner B', logo: '/IEDC.png' },
  { name: 'Partner A', logo: '/MulearnUCEK.png' },
  { name: 'Partner C', logo: '/Foss.png' }
]
