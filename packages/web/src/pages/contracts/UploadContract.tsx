import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export function UploadContract() {
  return (
    <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">Upload Contract</h1>
        <p className="text-muted-foreground">
          Select a contract file to prepare it for upload.
        </p>
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-base">Contract Document</CardTitle>
          <CardDescription>
            File selection, validation, and upload status will be added next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed border-border bg-muted/40 p-8 text-center">
            <p className="text-sm font-medium">Upload area placeholder</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Next step: add supported contract file types and validation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
