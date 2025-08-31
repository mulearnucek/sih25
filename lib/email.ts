import nodemailer from "nodemailer"

type Transporter = ReturnType<typeof nodemailer.createTransport>

declare global {
  // eslint-disable-next-line no-var
  var __mailerTransporter: Transporter | undefined
}

function getTransporter(): Transporter {
  if (global.__mailerTransporter) return global.__mailerTransporter

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !user || !pass) {
    throw new Error("Missing SMTP configuration (SMTP_HOST, SMTP_USER, SMTP_PASS)")
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  })

  global.__mailerTransporter = transporter
  return transporter
}

const FROM = process.env.SMTP_FROM || "SIH Organizers <no-reply@sih-internals.local>"

export async function sendRegistrationEmail(to: string, name?: string) {
  const transporter = getTransporter()
  const subject = "SIH Internals (UCEK) - Registration Confirmed"
  const text = `Hi ${name || ""},

Your registration for Smart India Hackathon - Internals (UCEK) is confirmed.

We will share updates and announcements via email.
Thank you and good luck!

— Organizing Team`
  await transporter.sendMail({ from: FROM, to, subject, text })
}

export async function sendBroadcastEmail(to: string[], subject: string, message: string) {
  const transporter = getTransporter()
  // Use BCC to avoid exposing recipient emails to each other
  await transporter.sendMail({ from: FROM, bcc: to, subject, text: message })
}
