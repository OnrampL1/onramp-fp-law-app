import { useId, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { type ContractMetadata } from "../../types/contracts";
import { cn } from "../../lib/utils";

interface ContractMetadataFormProps {
  value: ContractMetadata;
  disabled?: boolean;
  onChange: (value: ContractMetadata) => void;
}

export function ContractMetadataForm({
  value,
  disabled = false,
  onChange,
}: ContractMetadataFormProps) {
  const titleId = useId();
  const counterpartyId = useId();
  const tagInputId = useId();
  const expirationDateId = useId();

  const [tagInput, setTagInput] = useState("");

  function updateMetadata(nextValue: Partial<ContractMetadata>) {
    onChange({
      ...value,
      ...nextValue,
    });
  }

  function addTag() {
    const nextTag = tagInput.trim().replace(/,$/, "");

    if (!nextTag || value.tags.includes(nextTag)) {
      setTagInput("");
      return;
    }

    updateMetadata({
      tags: [...value.tags, nextTag],
    });
    setTagInput("");
  }

  function removeTag(tagToRemove: string) {
    updateMetadata({
      tags: value.tags.filter((tag) => tag !== tagToRemove),
    });
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
      return;
    }

    if (event.key === "Backspace" && tagInput.length === 0) {
      updateMetadata({
        tags: value.tags.slice(0, -1),
      });
    }
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
      <Field className="sm:col-span-2" label="Contract Title" htmlFor={titleId}>
        <Input
          id={titleId}
          value={value.title}
          disabled={disabled}
          placeholder="e.g. Master Services Agreement"
          onChange={(event) => updateMetadata({ title: event.target.value })}
        />
      </Field>

      <Field label="Counterparty" htmlFor={counterpartyId}>
        <Input
          id={counterpartyId}
          value={value.counterparty}
          disabled={disabled}
          placeholder="e.g. Northwind Technologies Inc."
          onChange={(event) =>
            updateMetadata({ counterparty: event.target.value })
          }
        />
      </Field>

      <Field
        className="sm:col-span-2"
        label="Tags"
        htmlFor={tagInputId}
        hint="Press Enter or comma to add"
      >
        <div
          className={cn(
            "flex min-w-0 flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {value.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
            >
              <span className="max-w-40 truncate">{tag}</span>
              <button
                type="button"
                className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={disabled}
                aria-label={`Remove ${tag}`}
                onClick={() => removeTag(tag)}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}

          <input
            id={tagInputId}
            value={tagInput}
            disabled={disabled}
            placeholder={
              value.tags.length > 0 ? "" : "e.g. renewal, high-value, EMEA"
            }
            className="min-w-32 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            onChange={(event) => setTagInput(event.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={addTag}
          />
        </div>
      </Field>

      <Field label="Expiration Date" htmlFor={expirationDateId}>
        <Input
          id={expirationDateId}
          type="date"
          value={value.expirationDate}
          disabled={disabled}
          onChange={(event) =>
            updateMetadata({ expirationDate: event.target.value })
          }
        />
      </Field>
    </div>
  );
}

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

function Field({ label, htmlFor, hint, className, children }: FieldProps) {
  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint ? (
          <span className="shrink-0 text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
