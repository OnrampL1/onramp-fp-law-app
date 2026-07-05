import { ShieldCheckIcon } from "../shared/icons";

/**
 * Top navigation bar for the public witness review page.
 * This is NOT the AppLayout header — it's a standalone bar
 * because external witnesses are not authenticated users.
 */
export function WitnessReviewHeader() {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
      {/* Logo + brand */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-none">Clausio</p>
          <p className="text-xs text-muted-foreground leading-tight">Legal Intelligence</p>
        </div>
      </div>

      {/* Contract verification badge */}
      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600 dark:text-green-400">
        <ShieldCheckIcon className="h-4 w-4" />
        Contract verification
      </span>
    </header>
  );
}
