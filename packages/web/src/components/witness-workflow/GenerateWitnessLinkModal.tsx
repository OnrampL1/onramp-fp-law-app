import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { LinkIcon, CopyIcon } from "../shared/icons";
import { CONTRACT_OPTIONS } from "@/lib/data";
import type { GeneratedLink, AccessType, AccessExpiry } from "./types";

interface GenerateWitnessLinkModalProps {
  open: boolean;
  onClose: () => void;
  refreshKey: number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function GenerateWitnessLinkModal({ open, onClose, refreshKey }: GenerateWitnessLinkModalProps) {
  const [selectedContract, setSelectedContract] = useState("");
  const [witnessName, setWitnessName]           = useState("");
  const [witnessEmail, setWitnessEmail]         = useState("");
  const [expiry, setExpiry]                     = useState<AccessExpiry>("48h");
  const [accessType, setAccessType]             = useState<AccessType>("Review & Acknowledge");
  const [sendEmail, setSendEmail]               = useState(true);
  const [generatedLink, setGeneratedLink]       = useState<GeneratedLink | null>(null);
  const [copied, setCopied]                     = useState(false);

  const isEmailValid = EMAIL_PATTERN.test(witnessEmail);
  const canGenerate =
    !!selectedContract &&
    !!witnessName &&
    !!witnessEmail &&
    isEmailValid;

  useEffect(() => {
    setSelectedContract("");
    setWitnessName("");
    setWitnessEmail("");
    setExpiry("48h");
    setAccessType("Review & Acknowledge");
    setSendEmail(true);
    setGeneratedLink(null);
    setCopied(false);
  }, [refreshKey]);

  if (!open) return null;

  function handleGenerate() {
    if (!canGenerate) return;
    // Generate a mock URL — replace with real API call when backend is ready
    const token = `wv_${Math.random().toString(36).substring(2, 10)}`;
    const now   = new Date();
    const expiryMs: Record<AccessExpiry, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "48h": 48 * 60 * 60 * 1000,
      "72h": 72 * 60 * 60 * 1000,
      "7d":  7  * 24 * 60 * 60 * 1000,
    };
    const expirationDate = new Date(now.getTime() + expiryMs[expiry]);
    const formatted = expirationDate.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    }) + " · " + expirationDate.toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: false,
    });

    setGeneratedLink({
      url:            `https://app.clausio.com/witness/review?t=${token}`,
      expirationDate: formatted,
      accessType,
    });
  }

  function handleRegenerate() {
    setGeneratedLink(null);
    handleGenerate();
  }

  function handleCopy() {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    // Reset all state when closing
    setSelectedContract("");
    setWitnessName("");
    setWitnessEmail("");
    setExpiry("48h");
    setAccessType("Review & Acknowledge");
    setSendEmail(true);
    setGeneratedLink(null);
    setCopied(false);
    onClose();
  }

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Blur overlay */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Generate Witness Link</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Issue a secure, single-use access link for an external witness.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="ml-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 pb-2">

          {/* Contract select */}
          <div className="space-y-1.5">
            <Label htmlFor="modal-contract">Contract</Label>
            <select
              id="modal-contract"
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="modal-name">Witness Name</Label>
              <Input
                id="modal-name"
                placeholder="Full name"
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modal-email">Witness Email</Label>
              <Input
                id="modal-email"
                type="email"
                placeholder="name@firm.com"
                value={witnessEmail}
                onChange={(e) => setWitnessEmail(e.target.value)}
              />
              {witnessEmail && !isEmailValid ? (
                <p className="text-xs text-destructive">Enter a valid email address.</p>
              ) : null}
            </div>
          </div>

          {/* Expiry + access type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="modal-expiry">Access Expiration</Label>
              <select
                id="modal-expiry"
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
              <Label htmlFor="modal-access">Access Type</Label>
              <select
                id="modal-access"
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
              id="modal-send-email"
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <Label htmlFor="modal-send-email" className="cursor-pointer text-sm font-normal">
              Send invitation email to witness
            </Label>
          </div>

          {/* Generated URL row — shown after generation */}
          {generatedLink && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 shrink-0 text-green-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
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
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 pt-4">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          {generatedLink ? (
            <Button size="sm" className="gap-1.5" onClick={handleRegenerate}>
              <LinkIcon className="h-3.5 w-3.5" />
              Regenerate
            </Button>
          ) : (
            <Button size="sm" className="gap-1.5" onClick={handleGenerate} disabled={!canGenerate}>
              <LinkIcon className="h-3.5 w-3.5" />
              Generate Secure Link
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
