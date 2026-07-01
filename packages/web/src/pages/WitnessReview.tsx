import {
  WitnessReviewHeader,
  ContractInfoCard,
  ContractDocumentViewer,
  WitnessAcknowledgementPanel,
  WitnessReviewFooter,
} from "../components/witness-review";
import {
  REVIEW_CONTRACT,
  WITNESS_INFO,
  DOCUMENT_PAGES,
} from "../components/witness-review/data";


export function WitnessReview() {
  function handleDownload() {
    // Wire to real download endpoint when backend is ready
    console.log("Download contract copy");
  }

  function handleAcknowledge() {
    // Wire to real acknowledgement endpoint when backend is ready
    console.log("Contract acknowledged");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <WitnessReviewHeader />

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8 sm:px-6">

        {/* Page intro */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Secure witness review
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            Review and witness this contract
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            You have been invited as an independent witness. Please review the full contract below,
            then confirm your acknowledgement at the bottom of the page.
          </p>
        </div>

        {/* Contract info */}
        <ContractInfoCard contract={REVIEW_CONTRACT} />

        {/* Document viewer */}
        <ContractDocumentViewer pages={DOCUMENT_PAGES} />

        {/* Acknowledgement */}
        <WitnessAcknowledgementPanel
          witness={WITNESS_INFO}
          contract={REVIEW_CONTRACT}
          securityToken="WV-Y0W1ZC-7F3A"
          timezone="Asia/Beirut"
          onDownload={handleDownload}
          onAcknowledge={handleAcknowledge}
        />

      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <WitnessReviewFooter />

    </div>
  );
}