import { useEffect, useMemo, useRef, useState } from "react";
import { AxiosError } from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { X } from "lucide-react";
import { LinkIcon, CopyIcon, CalendarIcon, SendIcon } from "../shared/icons";
import { useContractsList } from "@/hooks/useContractsList";
import { useCreateWitnessLink } from "@/hooks/useWitnessLinks";
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import type { GeneratedLink, AccessExpiry } from "./types";

interface GenerateWitnessAccessPanelProps {
  /** Called by WitnessWorkflow when Refresh is pressed — clears generated link */
  generatedLink: GeneratedLink | null;
  onLinkGenerated: (link: GeneratedLink | null) => void;
  refreshKey: number;
  /** Pre-selects the contract dropdown when arriving from a contract's own
   * "Generate Witness Link" action instead of starting empty. */
  initialContractId?: string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EXPIRY_HOURS: Record<AccessExpiry, number> = {
  "24h": 24,
  "48h": 48,
  "72h": 72,
  "7d": 7 * 24,
};

function formatExpiryDate(isoDate: string): string {
  const date = new Date(isoDate);
  return (
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  );
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const message = (error.response?.data as { error?: string } | undefined)?.error;
    if (message) return message;
  }
  return "Something went wrong generating the link. Please try again.";
}

export function GenerateWitnessAccessPanel({
  generatedLink,
  onLinkGenerated,
  refreshKey,
  initialContractId,
}: GenerateWitnessAccessPanelProps) {
  const [selectedContract, setSelectedContract] = useState(
    initialContractId ?? "",
  );
  const [witnessName, setWitnessName]           = useState("");
  const [witnessEmail, setWitnessEmail]         = useState("");
  const [expiry, setExpiry]                     = useState<AccessExpiry>("48h");
  const [sendEmail, setSendEmail]               = useState(true);
  const [copied, setCopied]                     = useState(false);

  const contractsQuery = useContractsList({
    sortBy: "updatedAt",
    sortDirection: "desc",
    page: 1,
    // GET /contracts caps pageSize at 50 (MAX_PAGE_SIZE in
    // contract.schemas.ts) — anything higher 422s and silently breaks this
    // dropdown. If an org ever has >50 contracts, this select will need
    // real pagination or search-as-you-type rather than a bigger number.
    pageSize: 50,
  });
  const createWitnessLink = useCreateWitnessLink();

  const contractOptions = useMemo(
    () =>
      (contractsQuery.data?.items ?? []).map((c) => ({
        value: c.id,
        label: c.title,
      })),
    [contractsQuery.data],
  );

  // Combobox only auto-fills the input with an item's label when the
  // item's *value* itself carries the {value, label} shape — a bare id
  // string doesn't get resolved. Passing the matched option object (not
  // just its id) as the controlled value is what makes the input show the
  // contract's title instead of its raw UUID.
  const selectedContractOption = useMemo(
    () => contractOptions.find((o) => o.value === selectedContract) ?? null,
    [contractOptions, selectedContract],
  );

  const canGenerate =
    !!selectedContract &&
    !!witnessName &&
    !!witnessEmail &&
    EMAIL_PATTERN.test(witnessEmail) &&
    !createWitnessLink.isPending;

  const selectClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  async function handleGenerate() {
    if (!canGenerate) return;

    try {
      const result = await createWitnessLink.mutateAsync({
        contractId: selectedContract,
        witnessEmail,
        witnessName,
        expiresInHours: EXPIRY_HOURS[expiry],
        sendEmail,
      });

      onLinkGenerated({
        id: result.id,
        contractId: result.contractId,
        url: result.witnessUrl ?? "",
        expirationDate: formatExpiryDate(result.expiresAt),
        // Fixed — not a real choice, see AccessType's definition.
        accessType: "Review Only",
        witnessEmail: result.witnessEmail,
        witnessName: result.witnessName,
        emailSentAt: result.emailSentAt,
      });
    } catch {
      // Surfaced via createWitnessLink.isError below — nothing further to
      // do here, mutateAsync already rejected.
    }
  }

  // Runs only when refreshKey actually changes (a real Refresh click), not
  // on mount. A "has this run before" ref breaks under React StrictMode,
  // which deliberately replays effects once in dev: the replay would see
  // the ref already flipped and reset the form anyway, wiping out an
  // initialContractId pre-selection before the user ever saw it. Comparing
  // against the last-seen refreshKey is replay-safe — both the original run
  // and the replay observe the same (unchanged) refreshKey and skip.
  const previousRefreshKeyRef = useRef(refreshKey);
  useEffect(() => {
    if (previousRefreshKeyRef.current === refreshKey) {
      return;
    }
    previousRefreshKeyRef.current = refreshKey;
    setSelectedContract("");
    setWitnessName("");
    setWitnessEmail("");
    setExpiry("48h");
    setSendEmail(true);
    setCopied(false);
    createWitnessLink.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  function handleCopy() {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClear() {
    setSelectedContract("");
    setWitnessName("");
    setWitnessEmail("");
    setExpiry("48h");
    setSendEmail(true);
    setCopied(false);
    createWitnessLink.reset();
    onLinkGenerated(null);
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
              <Combobox
                items={contractOptions}
                value={selectedContractOption}
                onValueChange={(option) =>
                  setSelectedContract(option?.value ?? "")
                }
                isItemEqualToValue={(a, b) => a?.value === b?.value}
                disabled={contractsQuery.isLoading}
              >
                <ComboboxInputGroup>
                  <ComboboxInput
                    id="panel-contract"
                    placeholder={
                      contractsQuery.isLoading
                        ? "Loading contracts…"
                        : "Search contracts…"
                    }
                  />
                  <ComboboxTrigger aria-label="Toggle contract list" />
                </ComboboxInputGroup>
                <ComboboxContent emptyMessage="No contracts found.">
                  {(item: { value: string; label: string }) => (
                    <ComboboxItem key={item.value} value={item}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxContent>
              </Combobox>
              {contractsQuery.isError && (
                <p className="text-xs text-destructive">
                  Couldn't load contracts. Try refreshing the page.
                </p>
              )}
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
                <Label>Access Type</Label>
                {/* Fixed, non-interactive — every witness gets identical
                    read-only access (BR-8), so this isn't a real choice. */}
                <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
                  Review Only
                </div>
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
                {createWitnessLink.isPending ? "Generating…" : "Generate Secure Link"}
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
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={handleClear}
                disabled={!generatedLink}
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            </div>

            {createWitnessLink.isError && (
              <p className="text-sm text-destructive">
                {extractErrorMessage(createWitnessLink.error)}
              </p>
            )}
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

              {/* Email status — "sent" means handed to the mail queue, not confirmed delivered */}
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <SendIcon className="h-3.5 w-3.5 shrink-0" />
                {generatedLink.emailSentAt
                  ? `Emailed to ${generatedLink.witnessEmail}`
                  : "Not emailed — share the link directly."}
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
