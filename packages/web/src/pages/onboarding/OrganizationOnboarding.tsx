import { Building2, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export function OrganizationOnboarding() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-xl shadow-sm">
        <CardHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="size-5" />
          </div>
          <CardTitle>Organization Setup</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Preparing your workspace setup.
        </CardContent>
      </Card>
    </div>
  );
}
