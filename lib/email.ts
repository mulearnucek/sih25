import { Resend } from "resend"

export function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    throw new Error("Missing RESEND_API_KEY")
  }
  return new Resend(key)
}

export async function sendRegistrationEmail(to: string, name?: string) {
  const resend = getResend()
  const subject = "SIH Internals (UCEK) - Registration Confirmed"
  const text = `Hi ${name || ""},

Your registration for Smart India Hackathon - Internals (UCEK) is confirmed.

We will share updates and announcements via email.
Thank you and good luck!

— Organizing Team`
  await resend.emails.send({ to, from: "SIH Internals <no-reply@sih-internals.local>", subject, text })
}

export async function sendBroadcastEmail(to: string[], subject: string, message: string) {
  const resend = getResend()
  await resend.emails.send({ to, from: "SIH Organizers <no-reply@sih-internals.local>", subject, text: message })
}
