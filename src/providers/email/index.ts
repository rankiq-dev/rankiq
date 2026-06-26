import { config } from "@/config"

const RESEND_API = "https://api.resend.com/emails"

export interface SendEmailOpts {
  to:      string
  subject: string
  html:    string
  replyTo?: string
}

export async function sendEmail(opts: SendEmailOpts): Promise<{ id: string }> {
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:     config.emailFrom,
      to:       [opts.to],
      subject:  opts.subject,
      html:     opts.html,
      reply_to: opts.replyTo,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend API error ${res.status}: ${text}`)
  }

  const json = (await res.json()) as { id: string }
  return { id: json.id }
}
