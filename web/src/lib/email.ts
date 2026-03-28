import { Resend } from "resend";

const DEFAULT_FROM = "ShtëpiAL <noreply@shtepi.al>";

let resend: Resend | null = null;

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ id: string } | null> {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client.emails.send({
    from: from ?? process.env.RESEND_FROM_ADDRESS ?? DEFAULT_FROM,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[email] Failed to send:", error);
    throw new Error(error.message);
  }

  return data;
}
