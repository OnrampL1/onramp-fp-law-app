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

function buildOwnerAssignedIntro(organizationName: string | undefined): string {
  const org = organizationName ?? "your organization";
  return `An organization has been created for you on Clausio as the owner of ${org}.`;
}

function buildWitnessIntro(
  issuerName: string | undefined,
  organizationName: string | undefined,
  contractTitle: string,
): string {
  const org = organizationName ? `${organizationName} on Clausio` : "Clausio";
  const invitedBy = issuerName ? `${issuerName} has invited you` : "You've been invited";

  return `${invitedBy} to act as an independent witness for "${contractTitle}" via ${org}.`;
}

// Three templates now — this codebase still has no template engine/registry,
// just a switch. Add another case here (and a matching call site) if a
// fourth is ever needed before that's worth introducing.
function renderTemplate(
  template: string,
  variables: Record<string, string> = {},
): { html: string; text: string } {
  switch (template) {
    case "invitation": {
      const greeting = variables.fullName
        ? `Hello ${variables.fullName},`
        : "Hello,";
      const acceptInvitationUrl = variables.acceptInvitationUrl ?? "";
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
          "Open the link below to set up your name and password:",
          acceptInvitationUrl,
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
            <p>Use the button below to set up your name and password:</p>
            <p style="margin: 28px 0;">
              <a href="${acceptInvitationUrl}" style="display:inline-block;padding:12px 24px;background:#1E3A5F;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
                Accept Invitation
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
    case "owner-assigned": {
      const greeting = variables.fullName
        ? `Hello ${variables.fullName},`
        : "Hello,";
      const loginUrl = variables.loginUrl ?? "";
      const intro = buildOwnerAssignedIntro(variables.organizationName);

      return {
        text: [
          greeting,
          "",
          intro,
          "",
          "Sign in with the temporary credentials below to get started:",
          `Email: ${variables.email ?? ""}`,
          `Temporary password: ${variables.temporaryPassword ?? ""}`,
          "",
          loginUrl,
          "",
          "You'll be asked to set a new password, then complete your organization's onboarding profile.",
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
            <p>Sign in with the temporary credentials below to get started:</p>
            <p style="margin: 20px 0; padding: 16px; background: #f4f4f5; border-radius: 6px; font-size: 14px;">
              Email: <strong>${variables.email ?? ""}</strong><br />
              Temporary password: <strong>${variables.temporaryPassword ?? ""}</strong>
            </p>
            <p style="margin: 28px 0;">
              <a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#1E3A5F;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
                Sign In
              </a>
            </p>
            <p style="color:#666;font-size:13px;">
              You'll be asked to set a new password, then complete your organization's onboarding profile.
            </p>
            <p style="margin-top: 32px;">Welcome to Clausio.</p>
          </div>
        `,
      };
    }
    case "witness": {
      const greeting = variables.witnessName ? `Hello ${variables.witnessName},` : "Hello,";
      const witnessUrl = variables.witnessUrl ?? "";
      const expiresAt = variables.expiresAt ?? "";
      const intro = buildWitnessIntro(
        variables.issuerName,
        variables.organizationName,
        variables.contractTitle ?? "a contract",
      );

      return {
        text: [
          greeting,
          "",
          intro,
          "",
          "No account or registration is required — open the link below to review the contract:",
          witnessUrl,
          "",
          `This link is single-use and expires on ${expiresAt}.`,
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
            <p>No account or registration is required — use the button below to review the contract:</p>
            <p style="margin: 28px 0;">
              <a href="${witnessUrl}" style="display:inline-block;padding:12px 24px;background:#1E3A5F;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
                Review Contract
              </a>
            </p>
            <p style="color:#666;font-size:13px;">
              This link is single-use and expires on ${expiresAt}. If you weren't expecting this invitation, you can safely ignore this email.
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
