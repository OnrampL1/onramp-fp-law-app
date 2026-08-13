import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "@/components/ui/button";
import { SparklesIcon } from "../shared/icons";
import { BarChart3, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AiInsightsPanel() {
  const navigate = useNavigate();

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <SparklesIcon />
          <CardTitle className="text-base font-semibold">AI Insights</CardTitle>
        </div>
        <CardDescription>
          Portfolio-level AI insight aggregation is not connected yet
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-border p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <BarChart3 className="size-5" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Per-contract AI analysis is available
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Portfolio counts for high-risk contracts, auto-renewal alerts,
              liability risks, non-competes, and IP assignment findings need a
              dedicated backend aggregate over completed risk analyses.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <ShieldAlert className="size-5" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Mock insight counts removed</p>
            <p className="text-xs leading-relaxed">
              This panel no longer displays fake risk metrics. The next backend
              enhancement should calculate these values server-side and keep all
              results organization-scoped.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate("/contracts")}
        >
          View Contracts
        </Button>
      </CardContent>
    </Card>
  );
}
