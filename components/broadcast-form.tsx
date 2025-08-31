"use client"

export default function BroadcastForm() {
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
      <input type="text" name="subject" placeholder="Subject" className="rounded-md border px-3 py-2" required />
      <textarea name="message" placeholder="Message" className="min-h-28 rounded-md border px-3 py-2" required />
      <button
        onClick={async (e) => {
          const form = (e.currentTarget as HTMLButtonElement).closest("form")!
          const subject = (form.elements.namedItem("subject") as HTMLInputElement).value
          const message = (form.elements.namedItem("message") as HTMLTextAreaElement).value
          const r = await fetch("/api/dashboard/broadcast", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subject, message }),
          })
          if (r.ok) alert("Broadcast sent")
          else {
            const j = await r.json().catch(() => ({}))
            alert(j.error || "Failed to send")
          }
        }}
        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Send Email
      </button>
    </form>
  )
}
