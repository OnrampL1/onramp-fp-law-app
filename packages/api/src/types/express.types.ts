import { Request } from "express";
import { AccessTokenPayload } from "@starter-kit/shared";

export interface AuthenticatedRequest extends Request {
  user: AccessTokenPayload;
}
