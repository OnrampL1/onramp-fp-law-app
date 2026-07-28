import type { Job } from "bullmq";
import { Resend } from "resend";
import type { EmailJobData, EmailJobResult } from "@starter-kit/shared";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("Missing required env var: RESEND_API_KEY");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getFromAddress(): string {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error("Missing required env var: EMAIL_FROM");
  }
  return from;
}

const CLAUSIO_BLURB =
  "a platform for managing and collaborating on legal contracts";

function buildInvitationIntro(
  inviterName: string | undefined,
  organizationName: string | undefined,
): string {
  const org = organizationName ? `${organizationName} on Clausio` : "Clausio";
  const invitedBy = inviterName ? `You've been invited by ${inviterName} to` : "You've been invited to";

  return `${invitedBy} join ${org}, ${CLAUSIO_BLURB}.`;
}

// No template engine exists in this codebase yet — this is the one template
// the queue currently sends (invitation.service.ts). Add a case here (and a
// matching entry in EmailJobData.template call sites) if a second template
// is ever needed, rather than introducing a template registry for one type.
function renderTemplate(
  template: string,
  variables: Record<string, string> = {},
): { html: string; text: string } {
  switch (template) {
    case "invitation": {
      const greeting = variables.fullName
        ? `Hello ${variables.fullName},`
        : "Hello,";
      const token = variables.token ?? "";
      const registerUrl = variables.registerUrl ?? "";
      const intro = buildInvitationIntro(
        variables.inviterName,
        variables.organizationName,
      );

      return {
        text: [
          greeting,
          "",
          intro,
          "",
          "Go to the registration page and enter this invitation token along with your name and password:",
          registerUrl,
          "",
          `Invitation token: ${token}`,
          "",
          "This invitation will expire in 7 days. If you weren't expecting this invitation, you can safely ignore this email.",
          "",
          "Welcome to Clausio.",
        ].join("\n"),
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
            <p style="font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase; color: #6b7280; margin-bottom: 24px;">
              Clausio
            </p>
            <p>${greeting}</p>
            <p>${intro}</p>
            <p>Go to the registration page and enter the invitation token below along with your name and password:</p>
            <p style="margin: 20px 0;">
              <code style="display:block;white-space:nowrap;overflow-x:auto;font-family:'SF Mono',Consolas,Menlo,monospace;font-size:16px;letter-spacing:0.02em;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:6px;padding:12px 16px;color:#1a1a1a;user-select:all;">${token}</code>
            </p>
            <p style="margin: 28px 0;">
              <a href="${registerUrl}" style="display:inline-block;padding:12px 24px;background:#1E3A5F;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
                Go to Registration
              </a>
            </p>
            <p style="color:#666;font-size:13px;">
              This invitation will expire in 7 days. If you weren't expecting this invitation, you can safely ignore this email.
            </p>
            <p style="margin-top: 32px;">Welcome to Clausio.</p>
          </div>
        `,
      };
    }
    default:
      throw new Error(`Unknown email template: ${template}`);
  }
}

export async function processEmailJob(
  job: Job<EmailJobData, EmailJobResult>,
): Promise<EmailJobResult> {
  const { to, subject, template, variables } = job.data;

  const { html, text } = renderTemplate(template, variables);

  const { data, error } = await getResendClient().emails.send({
    from: getFromAddress(),
    to,
    subject,
    html,
    text,
  });

  // The Resend SDK reports API failures via `error`, not by throwing — throw
  // explicitly so BullMQ's configured retry/backoff (see queue/client.ts)
  // actually engages instead of silently swallowing the failure.
  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
  if (!data) {
    throw new Error("Resend returned no data and no error");
  }

  return { messageId: data.id };
}
