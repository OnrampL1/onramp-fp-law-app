import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { LinkIcon, CopyIcon } from "./icons";
import { CONTRACT_OPTIONS } from "./data";


export function GenerateWitnessAccessPanel() {
  const [selectedContract, setSelectedContract] = useState("");
  const [witnessName, setWitnessName]           = useState("");
  const [witnessEmail, setWitnessEmail]         = useState("");
  const [expiry, setExpiry]                     = useState("48h");
  const [accessType, setAccessType]             = useState("Review & Acknowledge");
  const [sendEmail, setSendEmail]               = useState(true);
  const [generated, setGenerated]               = useState(false);

  function handleGenerate() {
    if (!selectedContract || !witnessName || !witnessEmail) return;
    setGenerated(true);
  }

  function handleCopy() {
    navigator.clipboard.writeText("https://clausio.app/witness/secure-link-placeholder");
  }

  return (
    <Card>
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

            {/* Contract select */}
            <div className="space-y-1.5">
              <Label htmlFor="contract">Contract</Label>
              <select
                id="contract"
                value={selectedContract}
                onChange={(e) => setSelectedContract(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                <Label htmlFor="witnessName">Witness Name</Label>
                <Input
                  id="witnessName"
                  placeholder="Full name"
                  value={witnessName}
                  onChange={(e) => setWitnessName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="witnessEmail">Witness Email</Label>
                <Input
                  id="witnessEmail"
                  type="email"
                  placeholder="name@firm.com"
                  value={witnessEmail}
                  onChange={(e) => setWitnessEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Access expiration + access type */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="expiry">Access Expiration</Label>
                <select
                  id="expiry"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="24h">24h</option>
                  <option value="48h">48h</option>
                  <option value="72h">72h</option>
                  <option value="7d">7d</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="accessType">Access Type</Label>
                <select
                  id="accessType"
                  value={accessType}
                  onChange={(e) => setAccessType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="Review & Acknowledge">Review &amp; Acknowledge</option>
                  <option value="Review Only">Review Only</option>
                </select>
              </div>
            </div>

            {/* Send invitation email checkbox */}
            <div className="flex items-center gap-2">
              <input
                id="sendEmail"
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <Label htmlFor="sendEmail" className="cursor-pointer text-sm font-normal">
                Send invitation email to witness
              </Label>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleGenerate}
                disabled={!selectedContract || !witnessName || !witnessEmail}
              >
                <LinkIcon className="h-3.5 w-3.5" />
                Generate Secure Link
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleCopy}
                disabled={!generated}
              >
                <CopyIcon />
                Copy Link
              </Button>
            </div>
          </div>

          {/* ── Right: link preview / empty state ── */}
          <div className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
            {generated ? (
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mx-auto">
                  <LinkIcon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Secure link generated</p>
                <p className="break-all font-mono text-xs text-muted-foreground">
                  https://clausio.app/witness/secure-link-placeholder
                </p>
                <p className="text-xs text-muted-foreground">
                  Expires in {expiry} · {accessType}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mx-auto">
                  <LinkIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">No link generated yet</p>
                <p className="text-xs text-muted-foreground">
                  Complete the form and generate a secure link. It will appear here with its
                  expiration and status.
                </p>
              </div>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}