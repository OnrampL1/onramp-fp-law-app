import { useId, useRef, type ChangeEvent, type DragEvent } from "react";
import { Upload } from "lucide-react";
import { ACCEPTED_CONTRACT_FILE_EXTENSIONS } from "../../types/contracts";
import type { ContractFileValidationError } from "../../types/contracts";
import { cn } from "../../lib/utils";

interface ContractFileDropzoneProps {
  isDragging: boolean;
  error: ContractFileValidationError | null;
  disabled?: boolean;
  onSelectFile: (file: File | null | undefined) => void;
  onDraggingChange: (isDragging: boolean) => void;
}

export function ContractFileDropzone({
  isDragging,
  error,
  disabled = false,
  onSelectFile,
  onDraggingChange,
}: ContractFileDropzoneProps) {
  const inputId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const acceptedFileTypes = ACCEPTED_CONTRACT_FILE_EXTENSIONS.join(",");

  function openFilePicker() {
    if (!disabled) {
      inputRef.current?.click();
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onSelectFile(event.target.files?.item(0));
    event.target.value = "";
  }

  function handleDragOver(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (!disabled) {
      onDraggingChange(true);
    }
  }

  function handleDragLeave() {
    onDraggingChange(false);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    onDraggingChange(false);

    if (!disabled) {
      onSelectFile(event.dataTransfer.files.item(0));
    }
  }

  return (
    <div className="min-w-0 space-y-2">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={acceptedFileTypes}
        className="sr-only"
        disabled={disabled}
        onChange={handleFileChange}
      />

      <button
        type="button"
        className={cn(
          "flex w-full min-w-0 flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/30 px-4 py-10 text-center transition-colors",
          "hover:border-primary/70 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDragging && "border-primary bg-accent",
          disabled && "cursor-not-allowed opacity-60 hover:border-border",
          error && "border-destructive bg-destructive/5",
        )}
        aria-describedby={error ? `${descriptionId} ${errorId}` : descriptionId}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        onClick={openFilePicker}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm">
          <Upload className="h-6 w-6" aria-hidden="true" />
        </span>

        <span className="mt-4 text-sm font-medium">
          Drag and drop your contract here, or browse
        </span>

        <span id={descriptionId} className="mt-1 text-sm text-muted-foreground">
          PDF, DOC, DOCX, or TXT up to 25 MB
        </span>
      </button>

      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
