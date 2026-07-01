import { useState } from "react";
import { StatCard } from "../components/dashboard/components/StatCard";
import {
  WitnessWorkflowHeader,
  GenerateWitnessAccessPanel,
  GenerateWitnessLinkModal,
  WitnessInvitationsTable,
  WitnessAccessDetailsSidebar,
  WitnessReviewProgress,
  SecurityStatusPanel,
  ExpiringLinksPanel,
} from "../components/witness-workflow";
import {
  WITNESS_STATS,
  WITNESS_INVITATIONS,
  REVIEW_STAGES,
  SECURITY_FEATURES,
  EXPIRING_LINKS,
  ACCESS_ACTIVITY,
} from "../components/witness-workflow/data";
import type { WitnessInvitation, GeneratedLink } from "../components/witness-workflow/types";


export function WitnessWorkflow() {
  const [modalOpen, setModalOpen]                     = useState(false);
  const [selectedInvitation, setSelectedInvitation]   = useState<WitnessInvitation | null>(null);
  const [generatedLink, setGeneratedLink]             = useState<GeneratedLink | null>(null);
  const [refreshKey, setRefreshKey]                   = useState(0);
  
  function handleRefresh() {
    // Clears the generated link state
    // When backend is ready: also re-fetch witness access activity here
    setGeneratedLink(null);
    setRefreshKey((prev) => prev + 1);
  }

  return (
    <>
      <div className="space-y-6 pb-10">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <WitnessWorkflowHeader
          onGenerate={() => setModalOpen(true)}
          onRefresh={handleRefresh}
        />

        {/* ── KPI stat cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {WITNESS_STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* ── Generate witness access (inline panel) ───────────────────────── */}
        <GenerateWitnessAccessPanel
          generatedLink={generatedLink}
          onLinkGenerated={setGeneratedLink}
          refreshKey={refreshKey}
        />

        {/* ── Active witness invitations ───────────────────────────────────── */}
        <WitnessInvitationsTable
          invitations={WITNESS_INVITATIONS}
          onRowClick={setSelectedInvitation}
        />

        {/* ── Review progress + access activity tabs ───────────────────────── */}
        <WitnessReviewProgress
          stages={REVIEW_STAGES}
          activityItems={ACCESS_ACTIVITY}
        />

        {/* ── Security status ──────────────────────────────────────────────── */}
        <SecurityStatusPanel features={SECURITY_FEATURES} />

        {/* ── Expiring links warning ───────────────────────────────────────── */}
        <ExpiringLinksPanel links={EXPIRING_LINKS} />

      </div>

      {/* ── Modal (portal-like, renders above everything) ────────────────── */}
      <GenerateWitnessLinkModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        refreshKey={refreshKey}
      />

      {/* ── Sidebar + blur overlay ───────────────────────────────────────── */}
      <WitnessAccessDetailsSidebar
        invitation={selectedInvitation}
        onClose={() => setSelectedInvitation(null)}
      />
    </>
  );
}