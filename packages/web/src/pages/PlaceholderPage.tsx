import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";

/**
 * Placeholder page.
 *
 * Linked to by:
 *   - Each AI Insight category row  (AiInsightsPanel)
 *   - Each contract row             (ContractTable, ExpiringContractsList)
 *   - "See All Contracts" button    (ContractTable)
 *
 * When a real page is ready:
 *   1. Build the real page component.
 *   2. Replace this placeholder in your router with the real component.
 *   3. Nothing else changes — all links already point to the correct routes.
 */
export function PlaceholderPage() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-8 w-8 text-muted-foreground"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
          />
        </svg>
      </div>

      {/* Text */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Page Under Construction</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This page is not built yet.
        </p>
        {/* Show the current route so it's easy to know which page to build next */}
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Route: {location.pathname}{location.search}
        </p>
      </div>

      {/* Back button */}
      <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
        ← Go back
      </Button>
    </div>
  );
}