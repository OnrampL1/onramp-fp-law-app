import { ClipboardType, FileText, FileType2, Info, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function UploadGuidelinesPanel() {
  return (
    <Card className="min-w-0 sticky top-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Upload Guidelines
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 text-sm">
        <GuidelineSection title="Supported file types">
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>PDF (.pdf), text or scanned</span>
            </li>
            <li className="flex min-w-0 items-center gap-2">
              <FileType2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Word (.docx)</span>
            </li>
            <li className="flex min-w-0 items-center gap-2">
              <ClipboardType className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Plain text (.txt)</span>
            </li>
          </ul>
        </GuidelineSection>

        <Divider />

        <GuidelineSection title="Recommended file size">
          <p className="text-muted-foreground">
            Keep files under{" "}
            <span className="font-medium text-foreground">25 MB</span>.
            Text-based PDFs usually process faster and more accurately than
            scanned images.
          </p>
        </GuidelineSection>

        <Divider />

        <GuidelineSection title="AI analysis notes">
          <p className="text-muted-foreground">
            Analysis results are generated suggestions and may contain
            inaccuracies. Always verify output against the source document.
          </p>
        </GuidelineSection>

        <div className="flex min-w-0 items-start gap-3 rounded-md bg-muted/60 p-3">
          <Scale
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">
              Legal disclaimer:
            </span>{" "}
            This tool does not provide legal advice. AI output is for
            informational purposes only and is not a substitute for review by
            qualified counsel.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface GuidelineSectionProps {
  title: string;
  children: React.ReactNode;
}

function GuidelineSection({ title, children }: GuidelineSectionProps) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Divider() {
  return <div className="h-px bg-border" aria-hidden="true" />;
}
