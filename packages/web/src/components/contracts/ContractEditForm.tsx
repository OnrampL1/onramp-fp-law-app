import { useId, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CONTRACT_LEGAL_STATE_OPTIONS,
  type ContractLegalStatus,
} from "@/types/contracts";

export interface ContractEditFormState {
  title: string;
  counterparty: string;
  tags: string[];
  effectiveDate: string; // "" or "YYYY-MM-DD"
  expirationDate: string; // "" or "YYYY-MM-DD"
  legalState: ContractLegalStatus | "";
}

interface ContractEditFormProps {
  value: ContractEditFormState;
  disabled?: boolean;
  onChange: (value: ContractEditFormState) => void;
}

// Same hues as the Active/Draft/Expired/Terminated status badges (badges.tsx)
// and the RiskBadge severity dots — no new colors introduced.
const LEGAL_STATE_DOT_CLASS: Record<ContractLegalStatus, string> = {
  DRAFT: "bg-amber-500",
  ACTIVE: "bg-emerald-500",
  EXPIRED: "bg-muted-foreground",
  TERMINATED: "bg-red-500",
};

function LegalStateOption({ value }: { value: ContractLegalStatus }) {
  const label = CONTRACT_LEGAL_STATE_OPTIONS.find(
    (option) => option.value === value,
  )?.label;

  return (
    <span className="flex items-center gap-2">
      <span
        className={cn("size-2 rounded-full", LEGAL_STATE_DOT_CLASS[value])}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

export function ContractEditForm({
  value,
  disabled = false,
  onChange,
}: ContractEditFormProps) {
  const titleId = useId();
  const counterpartyId = useId();
  const tagInputId = useId();
  const effectiveDateId = useId();
  const expirationDateId = useId();
  const legalStateId = useId();

  const [tagInput, setTagInput] = useState("");

  function update(next: Partial<ContractEditFormState>) {
    onChange({ ...value, ...next });
  }

  function addTag() {
    const nextTag = tagInput.trim().replace(/,$/, "");

    if (!nextTag || value.tags.includes(nextTag)) {
      setTagInput("");
      return;
    }

    update({ tags: [...value.tags, nextTag] });
    setTagInput("");
  }

  function removeTag(tagToRemove: string) {
    update({ tags: value.tags.filter((tag) => tag !== tagToRemove) });
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
      return;
    }

    if (event.key === "Backspace" && tagInput.length === 0) {
      update({ tags: value.tags.slice(0, -1) });
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Basic Info
        </h2>

        <div className="space-y-4">
          <FormField label="Title" required htmlFor={titleId}>
            <Input
              id={titleId}
              value={value.title}
              disabled={disabled}
              placeholder="e.g. Master Services Agreement"
              onChange={(event) => update({ title: event.target.value })}
            />
          </FormField>

          <Separator className="border-b-[1px]" />

          <FormField label="Counterparty" required htmlFor={counterpartyId}>
            <Input
              id={counterpartyId}
              value={value.counterparty}
              disabled={disabled}
              placeholder="e.g. Acme Corporation"
              onChange={(event) =>
                update({ counterparty: event.target.value })
              }
            />
          </FormField>

          <Separator className="border-b-[1px]" />

          <FormField label="Tags" htmlFor={tagInputId}>
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
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </span>
              ))}

              <input
                id={tagInputId}
                value={tagInput}
                disabled={disabled}
                placeholder={
                  value.tags.length > 0 ? "" : "e.g. MSA, priority, renewal"
                }
                className="min-w-32 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={addTag}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Freeform labels to group and filter contracts.
            </p>
          </FormField>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Dates
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Effective Date" htmlFor={effectiveDateId}>
            <Input
              id={effectiveDateId}
              type="date"
              value={value.effectiveDate}
              disabled={disabled}
              onChange={(event) =>
                update({ effectiveDate: event.target.value })
              }
            />
          </FormField>

          <FormField label="Expiration Date" htmlFor={expirationDateId}>
            <Input
              id={expirationDateId}
              type="date"
              value={value.expirationDate}
              disabled={disabled}
              onChange={(event) =>
                update({ expirationDate: event.target.value })
              }
            />
          </FormField>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Legal Status
        </h2>

        <FormField label="Status" htmlFor={legalStateId}>
          <Select
            value={value.legalState === "" ? null : value.legalState}
            disabled={disabled}
            onValueChange={(next) =>
              update({ legalState: (next ?? "") as ContractLegalStatus | "" })
            }
          >
            <SelectTrigger id={legalStateId} className="w-full">
              <SelectValue placeholder="Not set">
                {(current: ContractLegalStatus | null) =>
                  current ? <LegalStateOption value={current} /> : "Not set"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CONTRACT_LEGAL_STATE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <LegalStateOption value={option.value} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </Card>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({ label, htmlFor, required, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
