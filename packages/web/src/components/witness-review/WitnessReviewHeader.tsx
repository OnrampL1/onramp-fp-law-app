import { useState } from "react";
import { Building2 } from "lucide-react";
import { ShieldCheckIcon } from "../shared/icons";

interface WitnessReviewHeaderProps {
  // Both optional so every existing caller (ProblemScreen, the loading
  // state) keeps working unchanged before an organization is even known -
  // those screens fall back to identifying the page as Clausio's own,
  // which is accurate there since no specific organization has been
  // resolved yet.
  organizationName?: string;
  organizationLogoUrl?: string | null;
}

/**
 * Top navigation bar for the public witness review page.
 * This is NOT the AppLayout header — it's a standalone bar
 * because external witnesses are not authenticated users.
 *
 * Branded as the organization that sent the witness link, not as Clausio -
 * matches how signing/witnessing platforms conventionally identify the
 * page as coming from the sender, not the platform itself.
 */
export function WitnessReviewHeader({
  organizationName,
  organizationLogoUrl,
}: WitnessReviewHeaderProps) {
  const [logoFailedToLoad, setLogoFailedToLoad] = useState(false);
  const showLogo = Boolean(organizationLogoUrl) && !logoFailedToLoad;

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
      {/* Logo + brand */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
          {showLogo ? (
            <img
              src={organizationLogoUrl!}
              alt=""
              className="size-full object-cover"
              onError={() => setLogoFailedToLoad(true)}
            />
          ) : (
            <Building2 className="size-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col justify-between gap-0.5">
          <p className="text-sm font-semibold text-foreground leading-none">
            {organizationName ?? "Clausio"}
          </p>
          <p className="text-xs text-muted-foreground leading-tight">
            {organizationName
              ? "Contract Witness Review"
              : "Legal Intelligence"}
          </p>
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
