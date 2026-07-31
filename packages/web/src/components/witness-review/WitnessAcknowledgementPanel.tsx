import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { UserIcon, ClockIcon, SecurityIcon, DownloadIcon, ShieldCheckIcon } from "../shared/icons";
import type { WitnessInfo, WitnessReviewContract } from "./types";

interface WitnessAcknowledgementPanelProps {
  witness:  WitnessInfo;
  contract: WitnessReviewContract;
  securityToken: string;
  timezone: string;
  /**
   * When this link was redeemed (status flips ISSUED -> USED atomically at
   * that point per witness.service.ts — there is no separate acknowledgement
   * step after the fact). Null only if this page could somehow render before
   * redemption, which shouldn't happen once step 4 wires the real redeem call.
   */
  usedAt: string | null;
  onDownload?: () => void;
}

/**
 * Bottom panel confirming the witness has accessed the contract.
 * - 3 info cards: witness info, access timestamp, security verification
 * - Download copy action
 * No acknowledgement checkbox/button: BR-8 scopes witness access to
 * read-only confirmation, and opening the link is itself the recorded event.
 */
export function WitnessAcknowledgementPanel({
  witness,
  contract,
  securityToken,
  timezone,
  usedAt,
  onDownload,
}: WitnessAcknowledgementPanelProps) {
  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-6">
      {/* ── Section heading ── */}
      <div>
        <h2 className="text-base font-semibold text-foreground">Witness access</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your access to this contract is recorded for legal purposes.
        </p>
      </div>

      {/* ── 3 info cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Witness info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserIcon />
              Witness information
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">{witness.name}</p>
            <p className="text-xs text-muted-foreground">{witness.role}</p>
            <p className="text-xs text-muted-foreground">{witness.email}</p>
          </CardContent>
        </Card>

        {/* Timestamp */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ClockIcon className="h-4 w-4" />
              Timestamp
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {usedAt ?? "Recorded on access"}
            </p>
            <p className="text-xs text-muted-foreground">Recorded in {timezone}</p>
          </CardContent>
        </Card>

        {/* Security verification */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <SecurityIcon />
              Security verification
            </div>
            <p className="mt-2 font-mono text-sm font-semibold text-foreground">{securityToken}</p>
            <p className="text-xs text-muted-foreground">256-bit signed link</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Access confirmation ── */}
      <div className="flex items-start gap-3 rounded-lg border border-border p-4">
        <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Access recorded. </span>
          Opening this link marked you as having reviewed {contract.name} ({contract.id}) as an
          independent witness{usedAt ? ` on ${usedAt}` : ""}. This link is single-use and can no
          longer be redeemed elsewhere.
        </p>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onDownload}>
          <DownloadIcon />
          Download copy
        </Button>
      </div>
    </div>
  );
}
