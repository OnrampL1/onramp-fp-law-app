import type { Request, Response, NextFunction, RequestHandler } from "express";
import { getPrismaClient, verifyWitnessSessionToken } from "@starter-kit/shared";
import { WITNESS_SESSION_COOKIE } from "../constants/witness.constants";

const prisma = getPrismaClient();

// Intentionally NOT AuthenticatedRequest/AccessTokenPayload — a witness has
// no User row, no organizationId, and no role. contractId is the only
// thing a witness-scoped handler is ever allowed to read to decide what
// contract it's serving; it is always derived here from the invitation,
// never from a client-supplied param/body field (BR-8).
export interface WitnessSession {
  witnessInvitationId: string;
  contractId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      witnessSession?: WitnessSession;
    }
  }
}

export interface WitnessAuthenticatedRequest extends Request {
  witnessSession: WitnessSession;
}

export async function witnessSessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.[WITNESS_SESSION_COOKIE] as string | undefined;

  if (!token) {
    res.status(401).json({ error: "Witness session required" });
    return;
  }

  let payload;
  try {
    payload = verifyWitnessSessionToken(token);
  } catch {
    res.status(401).json({ error: "Invalid or expired witness session" });
    return;
  }

  const invitation = await prisma.witnessInvitation.findUnique({
    where: { id: payload.witnessInvitationId },
  });

  // Re-checked against the database on every request, not just decoded
  // from the token — this is what makes revocation take effect
  // immediately (BR-8) instead of only once a self-contained session
  // token would eventually expire on its own.
  if (!invitation) {
    res.status(401).json({ error: "Invalid or expired witness session" });
    return;
  }

  if (invitation.isRevoked) {
    res.status(403).json({ error: "This witness access has been revoked" });
    return;
  }

  if (invitation.expiresAt.getTime() < Date.now()) {
    res.status(403).json({ error: "This witness access has expired" });
    return;
  }

  req.witnessSession = {
    witnessInvitationId: invitation.id,
    contractId: invitation.contractId,
  };
  next();
}

export function withWitnessSession(
  handler: (
    req: WitnessAuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => void | Promise<void>,
): RequestHandler {
  return handler as unknown as RequestHandler;
}
