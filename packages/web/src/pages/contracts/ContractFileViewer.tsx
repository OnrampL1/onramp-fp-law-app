import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useContractFile } from "@/hooks/useContractDetail";

// A minimal, chrome-free page (registered outside AppLayout in routes/index.tsx)
// opened in its own tab by ContractDetails' Download button. Its only job is
// to own the tab's <title> — browsers with a built-in PDF viewer (Chrome's
// PDFium) prefer the file's own embedded document metadata over anything we
// send in headers, so the only reliable way to force the real contract name
// onto the tab is to navigate to our own HTML page (whose <title> always
// wins) and embed the file inside it, rather than navigating directly to the
// presigned S3 URL.
export default function ContractFileViewer() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useContractFile(id);

  useEffect(() => {
    if (data?.fileName) {
      document.title = `${data.fileName} · Clausio`;
    }
  }, [data?.fileName]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading file…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Couldn't load this file</p>
        <p>Close this tab and try again from Contract Details.</p>
      </div>
    );
  }

  return (
    <iframe
      src={data.fileUrl}
      title={data.fileName}
      className="h-screen w-full border-0"
    />
  );
}
