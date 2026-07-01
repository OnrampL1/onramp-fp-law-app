import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { LinkIcon, CopyIcon, CalendarIcon, RefreshIcon } from "./icons";
import { CONTRACT_OPTIONS } from "./data";
import type { GeneratedLink, AccessType, AccessExpiry } from "./types";

interface GenerateWitnessAccessPanelProps {
  /** Called by WitnessWorkflow when Refresh is pressed — clears generated link */
  generatedLink: GeneratedLink | null;
  onLinkGenerated: (link: GeneratedLink) => void;
  refreshKey: number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function GenerateWitnessAccessPanel({
  generatedLink,
  onLinkGenerated,
  refreshKey,
}: GenerateWitnessAccessPanelProps) {
  const [selectedContract, setSelectedContract] = useState("");
  const [witnessName, setWitnessName]           = useState("");
  const [witnessEmail, setWitnessEmail]         = useState("");
  const [expiry, setExpiry]                     = useState<AccessExpiry>("48h");
  const [accessType, setAccessType]             = useState<AccessType>("Review & Acknowledge");
  const [sendEmail, setSendEmail]               = useState(true);
  const [copied, setCopied]                     = useState(false);

  const canGenerate =
    !!selectedContract &&
    !!witnessName &&
    !!witnessEmail &&
    EMAIL_PATTERN.test(witnessEmail);

  const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  function handleGenerate() {
    if (!canGenerate) return;
    const token = `wv_${Math.random().toString(36).substring(2, 14)}`;
    const now   = new Date();
    const expiryMs: Record<AccessExpiry, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "48h": 48 * 60 * 60 * 1000,
      "72h": 72 * 60 * 60 * 1000,
      "7d":  7  * 24 * 60 * 60 * 1000,
    };
    const expDate = new Date(now.getTime() + expiryMs[expiry]);
    const formatted =
      expDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " · " +
      expDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

    onLinkGenerated({
      url:            `https://app.clausio.com/witness/review?t=${token}`,
      expirationDate: formatted,
      accessType,
    });
  }

  useEffect(() => {
    setSelectedContract("");
    setWitnessName("");
    setWitnessEmail("");
    setExpiry("48h");
    setAccessType("Review & Acknowledge");
    setSendEmail(true);
    setCopied(false);
  }, [refreshKey]);

  function handleCopy() {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card key={refreshKey}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">Generate Witness Access</CardTitle>
        </div>
        <CardDescription>
          Create a secure, single-use link scoped to one contract for an external witness.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ── Left: form ── */}
          <div className="space-y-4">

            {/* Contract */}
            <div className="space-y-1.5">
              <Label htmlFor="panel-contract">Contract</Label>
              <select
                id="panel-contract"
                value={selectedContract}
                onChange={(e) => setSelectedContract(e.target.value)}
                className={selectClass}
              >
                <option value="" disabled>Select a contract</option>
                {CONTRACT_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Witness name + email */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="panel-name">Witness Name</Label>
                <Input
                  id="panel-name"
                  placeholder="Full name"
                  value={witnessName}
                  onChange={(e) => setWitnessName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="panel-email">Witness Email</Label>
                <Input
                  id="panel-email"
                  type="email"
                  placeholder="name@firm.com"
                  value={witnessEmail}
                  onChange={(e) => setWitnessEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Expiry + access type */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="panel-expiry">Access Expiration</Label>
                <select
                  id="panel-expiry"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value as AccessExpiry)}
                  className={selectClass}
                >
                  <option value="24h">24h</option>
                  <option value="48h">48h</option>
                  <option value="72h">72h</option>
                  <option value="7d">7d</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="panel-access">Access Type</Label>
                <select
                  id="panel-access"
                  value={accessType}
                  onChange={(e) => setAccessType(e.target.value as AccessType)}
                  className={selectClass}
                >
                  <option value="Review & Acknowledge">Review &amp; Acknowledge</option>
                  <option value="Review Only">Review Only</option>
                </select>
              </div>
            </div>

            {/* Send email checkbox */}
            <div className="flex items-center gap-2">
              <input
                id="panel-send-email"
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor="panel-send-email" className="cursor-pointer text-sm font-normal">
                Send invitation email to witness
              </Label>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleGenerate}
                disabled={!canGenerate}
              >
                <LinkIcon className="h-3.5 w-3.5" />
                Generate Secure Link
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleCopy}
                disabled={!generatedLink}
              >
                <CopyIcon />
                Copy Link
              </Button>
            </div>
          </div>

          {/* ── Right: generated URL panel / empty state ── */}
          {generatedLink ? (
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">

              {/* Header row: "Generated URL" + Pending badge */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Generated URL
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                  Pending
                </span>
              </div>

              {/* URL row */}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
                  {generatedLink.url}
                </span>
                <button
                  onClick={handleCopy}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Copy link"
                >
                  {copied
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 text-green-500"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    : <CopyIcon />
                  }
                </button>
              </div>

              {/* Expiry + access type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    Expiration Date
                  </div>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {generatedLink.expirationDate}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Access Type</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {generatedLink.accessType}
                  </p>
                </div>
              </div>

              {/* Security note */}
              <p className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Link is encrypted, single-use, and scoped to the selected contract only.
              </p>
            </div>
          ) : (
            /* Empty state */
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <LinkIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">No link generated yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Complete the form and generate a secure link. It will appear here with its
                expiration and status.
              </p>
            </div>
          )}

        </div>
      </CardContent>
    </Card>
  );
}