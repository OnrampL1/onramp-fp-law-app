import "@/styles/landing.css";
import {
  Hero,
  Pipeline,
  ContractIntelligence,
  InvestigatorPreview,
  RiskEvidence,
  ControlSection,
  FinalCTA,
  LandingNav,
  LandingFooter,
} from "@/components/landing";

export function Landing() {
  return (
    <div id="top" className="landing-scope min-h-screen bg-background text-foreground">
      <LandingNav />
      <main>
        <Hero />
        <Pipeline />
        <ContractIntelligence />
        <InvestigatorPreview />
        <RiskEvidence />
        <ControlSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
