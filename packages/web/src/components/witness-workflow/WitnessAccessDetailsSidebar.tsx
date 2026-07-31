import { Button } from "../../components/ui/button";
import { WitnessStatusBadge } from "./WitnessStatusBadge";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import type { WitnessLinkListItem } from "@/types/witness";

interface WitnessAccessDetailsSidebarProps {
  invitation: WitnessLinkListItem | null;
  onClose: () => void;
  onRevoke: (invitation: WitnessLinkListItem) => void;
}

export function WitnessAccessDetailsSidebar({
  invitation,
  onClose,
  onRevoke,
}: WitnessAccessDetailsSidebarProps) {
  if (!invitation) return null;

  const isRevoked = invitation.status === "revoked";

  return (
    <>
      {/* Blur overlay — clicking it closes the sidebar */}
      <div
        className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-start justify-between border-b border-border p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Witness Access Details</p>
              <p className="font-mono text-xs text-muted-foreground">{invitation.id.slice(0, 8)}…</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* CONTRACT INFORMATION */}
          <Section title="CONTRACT INFORMATION">
            <DetailRow label="Contract Title" value={invitation.contractTitle} bold />
            <DetailRow label="Reference" value={`${invitation.contractId.slice(0, 8)}…`} />
            <DetailRow label="Status">
              <WitnessStatusBadge status={invitation.status} />
            </DetailRow>
            <DetailRow label="Expiration Date" value={formatDate(invitation.expiresAt)} />
          </Section>

          <Divider />

          {/* WITNESS INFORMATION */}
          <Section title="WITNESS INFORMATION">
            <DetailRow label="Name" value={invitation.witnessName ?? "—"} bold />
            <DetailRow label="Email" value={invitation.witnessEmail} />
          </Section>

          <Divider />

          {/* ACCESS INFORMATION */}
          <Section title="ACCESS INFORMATION">
            <DetailRow label="Created" value={formatDate(invitation.createdAt)} />
            <DetailRow label="Issued By" value={invitation.issuedBy.fullName} />
            <DetailRow label="Expiration Date" value={formatDate(invitation.expiresAt)} />
            <DetailRow label="Current Status">
              <WitnessStatusBadge status={invitation.status} />
            </DetailRow>
            <DetailRow
              label="Last Used"
              value={invitation.usedAt ? formatRelativeTime(invitation.usedAt) : "Not yet used"}
            />
            <DetailRow
              label="Invitation Email"
              value={invitation.emailSentAt ? `Sent ${formatRelativeTime(invitation.emailSentAt)}` : "Not sent"}
            />
          </Section>
        </div>

        {/* ── Footer actions ── */}
        <div className="space-y-2 border-t border-border p-4">
          <Button
            variant="destructive"
            size="sm"
            className="w-full gap-1.5"
            disabled={isRevoked}
            onClick={() => onRevoke(invitation)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            {isRevoked ? "Already Revoked" : "Revoke Access"}
          </Button>
        </div>
      </aside>
    </>
  );
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border" />;
}

function DetailRow({
  label,
  value,
  bold,
  children,
}: {
  label: string;
  value?: string;
  bold?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      {children ?? (
        <span className={`text-right text-xs ${bold ? "font-semibold text-foreground" : "text-foreground"}`}>
          {value}
        </span>
      )}
    </div>
  );
}
