import { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { UserIcon, ClockIcon, SecurityIcon, DownloadIcon, ShieldCheckIcon } from "./icons";
import type { WitnessInfo, WitnessReviewContract } from "./types";

interface WitnessAcknowledgementPanelProps {
  witness:  WitnessInfo;
  contract: WitnessReviewContract;
  securityToken: string;
  timezone: string;
  onDownload?: () => void;
  onAcknowledge?: () => void;
}

/**
 * Bottom panel where the witness confirms they have reviewed the contract.
 * - 3 info cards: witness info, timestamp, security verification
 * - Legal checkbox with full confirmation text
 * - Download copy + Acknowledge contract buttons
 */
export function WitnessAcknowledgementPanel({
  witness,
  contract,
  securityToken,
  timezone,
  onDownload,
  onAcknowledge,
}: WitnessAcknowledgementPanelProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-6">
      {/* ── Section heading ── */}
      <div>
        <h2 className="text-base font-semibold text-foreground">Witness acknowledgement</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Confirm that you have reviewed the contract in full. This action is legally recorded.
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
              <ClockIcon />
              Timestamp
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">On acknowledgement</p>
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

      {/* ── Legal checkbox ── */}
      <div className="flex items-start gap-3 rounded-lg border border-border p-4">
        <input
          id="acknowledge-checkbox"
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
        />
        <label
          htmlFor="acknowledge-checkbox"
          className="cursor-pointer text-sm leading-relaxed text-muted-foreground"
        >
          <span className="font-semibold text-foreground">I have reviewed this contract. </span>
          I confirm I have read {contract.name} ({contract.id}) in its entirety and agree to act as
          an independent witness to its execution.
        </label>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onDownload}>
          <DownloadIcon />
          Download copy
        </Button>
        <Button
          size="sm"
          className="gap-1.5"
          disabled={!checked}
          onClick={onAcknowledge}
        >
          <ShieldCheckIcon />
          Acknowledge contract
        </Button>
      </div>
    </div>
  );
}