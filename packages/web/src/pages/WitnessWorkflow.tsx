import { StatCard } from "../components/dashboard/components/StatCard";
import { WitnessWorkflowHeader } from "../components/witness-workflow/WitnessWorkflowHeader";
import { GenerateWitnessAccessPanel } from "../components/witness-workflow/GenerateWitnessAccessPanel";
import { WitnessInvitationsTable } from "../components/witness-workflow/WitnessInvitationsTable";
import { WitnessReviewProgress } from "../components/witness-workflow/WitnessReviewProgress";
import { SecurityStatusPanel } from "../components/witness-workflow/SecurityStatusPanel";
import { ExpiringLinksPanel } from "../components/witness-workflow/ExpiringLinksPanel";
import {
  WITNESS_STATS,
  WITNESS_INVITATIONS,
  REVIEW_STAGES,
  SECURITY_FEATURES,
  EXPIRING_LINKS,
} from "../components/witness-workflow/data";


export function WitnessWorkflow() {
  return (
    <div className="space-y-6 pb-10">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <WitnessWorkflowHeader />

      {/* ── KPI stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {WITNESS_STATS.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* ── Generate witness access form ─────────────────────────────────────── */}
      <GenerateWitnessAccessPanel />

      {/* ── Active witness invitations ───────────────────────────────────────── */}
      <WitnessInvitationsTable invitations={WITNESS_INVITATIONS} />

      {/* ── Review progress funnel ───────────────────────────────────────────── */}
      <WitnessReviewProgress stages={REVIEW_STAGES} />

      {/* ── Security status ──────────────────────────────────────────────────── */}
      <SecurityStatusPanel features={SECURITY_FEATURES} />

      {/* ── Expiring links warning ───────────────────────────────────────────── */}
      <ExpiringLinksPanel links={EXPIRING_LINKS} />

    </div>
  );
}