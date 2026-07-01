import { LockFooterIcon } from "./icons";

/**
 * Footer bar shown at the bottom of the public witness review page.
 */
export function WitnessReviewFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="flex flex-col items-center justify-between gap-2 border-t border-border bg-card px-6 py-4 text-xs text-muted-foreground sm:flex-row">
      <div className="flex items-center gap-1.5">
        <LockFooterIcon />
        <span>Secured by Clausio · This link is private and encrypted</span>
      </div>
      <span>© {year} Clausio Holdings, LLC</span>
    </footer>
  );
}