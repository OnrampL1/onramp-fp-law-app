import { useCallback, useEffect, useRef, useState } from "react";
import { validateContractFile } from "../lib/contract-file-validation";
import { uploadContractFile } from "../services/contract-upload.service";
import type { UploadContractResponse } from "../services/contract-upload.service";
import type {
  ContractFileValidationError,
  SelectedContractFile,
} from "../types/contracts";
import { useQueryClient } from "@tanstack/react-query";

export type ContractUploadStatus =
  | "idle"
  | "ready"
  | "uploading"
  | "success"
  | "error";

export interface UseContractUploadResult {
  selectedFile: SelectedContractFile | null;
  validationError: ContractFileValidationError | null;
  uploadError: string | null;
  uploadResult: UploadContractResponse | null;
  status: ContractUploadStatus;
  isDragging: boolean;
  isUploading: boolean;
  selectFile: (file: File | null | undefined) => void;
  removeFile: () => void;
  setIsDragging: (isDragging: boolean) => void;
  uploadSelectedFile: () => Promise<void>;
  resetUpload: () => void;
  cancelUpload: () => void;
}

export function useContractUpload(): UseContractUploadResult {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<SelectedContractFile | null>(
    null,
  );
  const [validationError, setValidationError] =
    useState<ContractFileValidationError | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] =
    useState<UploadContractResponse | null>(null);
  const [status, setStatus] = useState<ContractUploadStatus>("idle");
  const [isDragging, setIsDragging] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isUploading = status === "uploading";

  const cancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const resetUpload = useCallback(() => {
    cancelUpload();
    setSelectedFile(null);
    setValidationError(null);
    setUploadError(null);
    setUploadResult(null);
    setStatus("idle");
    setIsDragging(false);
  }, [cancelUpload]);

  const removeFile = useCallback(() => {
    cancelUpload();
    setSelectedFile(null);
    setValidationError(null);
    setUploadError(null);
    setUploadResult(null);
    setStatus("idle");
  }, [cancelUpload]);

  const selectFile = useCallback(
    (file: File | null | undefined) => {
      cancelUpload();

      const validationResult = validateContractFile(file);

      setUploadError(null);
      setUploadResult(null);

      if (!validationResult.isValid) {
        setSelectedFile(null);
        setValidationError(validationResult.error);
        setStatus("error");
        return;
      }

      setSelectedFile(validationResult.file);
      setValidationError(null);
      setStatus("ready");
    },
    [cancelUpload],
  );

  const uploadSelectedFile = useCallback(async () => {
    if (!selectedFile || isUploading) {
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setStatus("uploading");
    setUploadError(null);
    setUploadResult(null);

    try {
      const result = await uploadContractFile({
        selectedFile,
        signal: abortController.signal,
      });

      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      setUploadResult(result);
      setStatus("success");
    } catch (error) {
      if (isAbortError(error)) {
        setStatus(selectedFile ? "ready" : "idle");
        return;
      }

      setUploadError("We could not upload the contract. Please try again.");
      setStatus("error");
    } finally {
      abortControllerRef.current = null;
    }
  }, [isUploading, selectedFile]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    selectedFile,
    validationError,
    uploadError,
    uploadResult,
    status,
    isDragging,
    isUploading,
    selectFile,
    removeFile,
    setIsDragging,
    uploadSelectedFile,
    resetUpload,
    cancelUpload,
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
