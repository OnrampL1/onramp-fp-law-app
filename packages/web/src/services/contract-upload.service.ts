import type { SelectedContractFile } from "../types/contracts";

export type UploadContractSource =
  | {
      kind: "file";
      selectedFile: SelectedContractFile;
    }
  | {
      kind: "text";
      text: string;
      title: string;
    };

export interface UploadContractRequest {
  source: UploadContractSource;
  signal?: AbortSignal;
}

export interface UploadContractResponse {
  contractId: string;
  fileName: string;
  uploadedAt: string;
  status: "uploaded";
}

const MOCK_UPLOAD_DELAY_MS = 900;

export async function uploadContractFile({
  source,
  signal,
}: UploadContractRequest): Promise<UploadContractResponse> {
  await waitForMockUpload(signal);

  return {
    contractId: crypto.randomUUID(),
    fileName:
      source.kind === "file"
        ? source.selectedFile.name
        : `${source.title || "Pasted contract"}.txt`,
    uploadedAt: new Date().toISOString(),
    status: "uploaded",
  };
}

function waitForMockUpload(signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Upload cancelled.", "AbortError"));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, MOCK_UPLOAD_DELAY_MS);

    function handleAbort() {
      window.clearTimeout(timeoutId);
      reject(new DOMException("Upload cancelled.", "AbortError"));
    }

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}
