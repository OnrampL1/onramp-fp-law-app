import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  FileText,
  Loader2,
  Pencil,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ContractEditForm,
  type ContractEditFormState,
} from "@/components/contracts/ContractEditForm";
import {
  useContractDetail,
  useUpdateContractMetadata,
} from "@/hooks/useContractDetail";
import type {
  ContractDetailResponse,
  ContractLegalStatus,
} from "@/types/contracts";

function toFormState(contract: ContractDetailResponse): ContractEditFormState {
  return {
    title: contract.title,
    counterparty: contract.counterparty,
    tags: contract.tags,
    effectiveDate: contract.effectiveDate ?? "",
    expirationDate: contract.expirationDate ?? "",
    legalState: (contract.legalState ?? "") as ContractLegalStatus | "",
  };
}

export default function ContractEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: contract,
    isLoading,
    isError,
    refetch,
  } = useContractDetail(id);
  const updateMutation = useUpdateContractMetadata(id);

  const [form, setForm] = useState<ContractEditFormState | null>(null);

  // Initialize the form exactly once when the contract first loads. Deliberately
  // not re-syncing on every background refetch — that would silently discard
  // in-progress edits. The only other place form state is reset is the
  // explicit "Reload" action in the conflict banner below.
  useEffect(() => {
    if (contract && form === null) {
      setForm(toFormState(contract));
    }
  }, [contract, form]);

  const saveErrorStatus = isAxiosError(updateMutation.error)
    ? updateMutation.error.response?.status
    : undefined;
  const showConflictBanner = saveErrorStatus === 409;
  const showGenericSaveError =
    updateMutation.isError && saveErrorStatus !== 409 && saveErrorStatus !== 404;

  async function handleReload() {
    const result = await refetch();
    if (result.data) {
      setForm(toFormState(result.data));
    }
    updateMutation.reset();
  }

  function handleSave() {
    if (!form || !contract || !id) return;

    updateMutation.mutate(
      {
        title: form.title,
        counterparty: form.counterparty,
        tags: form.tags,
        effectiveDate: form.effectiveDate,
        expirationDate: form.expirationDate,
        legalState: form.legalState === "" ? null : form.legalState,
        version: contract.version,
      },
      {
        onSuccess: () => {
          navigate(`/contracts/${id}`);
        },
        onError: (error) => {
          const status = isAxiosError(error) ? error.response?.status : undefined;
          if (status === 404) {
            // The contract disappeared out from under this session (deleted
            // elsewhere) — the list query may still be caching the old,
            // now-wrong row. Invalidate rather than let the redirect land on
            // stale data the user would only see corrected after a refresh.
            queryClient.invalidateQueries({ queryKey: ["contracts"] });
            navigate("/contracts", {
              state: {
                notice:
                  "This contract could not be found — it may have been removed.",
              },
            });
          }
          // 409 and other statuses are surfaced inline via updateMutation.error.
        },
      },
    );
  }

  if (isLoading || (contract && !form)) {
    return (
      <div className="flex h-[60vh] items-center justify-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        Loading contract…
      </div>
    );
  }

  if (isError || !contract || !id) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Contract not found</p>
        <Link to="/contracts" className="text-primary hover:underline">
          Back to Contracts
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Breadcrumb */}
      <nav
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
        aria-label="Breadcrumb"
      >
        <Link to="/contracts" className="transition-colors hover:text-foreground">
          Contracts
        </Link>
        <ChevronRight className="size-3.5" />
        <Link
          to={`/contracts/${id}`}
          className="max-w-48 truncate transition-colors hover:text-foreground"
        >
          {contract.title}
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="font-medium text-foreground">Edit</span>
      </nav>

      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-card">
              <Pencil className="size-4 text-muted-foreground" />
            </span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
              Edit Contract
            </h1>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-[42px] text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Building2 className="size-3.5" />
              {contract.counterparty}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <FileText className="size-3.5 shrink-0" />
              <span className="truncate">{contract.title}</span>
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={updateMutation.isPending}
            onClick={() => navigate(`/contracts/${id}`)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={updateMutation.isPending}
            onClick={handleSave}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>

      {/* Conflict banner — only rendered on an actual 409 from the save
          mutation, never shown by default or toggled manually. */}
      {showConflictBanner && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">
                This contract was updated by someone else
              </p>
              <p className="text-amber-800">
                Reload to see the latest version before saving your changes.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-amber-300 bg-transparent text-amber-900 hover:bg-amber-100"
              onClick={handleReload}
            >
              Reload
            </Button>
            <button
              type="button"
              aria-label="Dismiss"
              className="text-amber-700 transition-colors hover:text-amber-900"
              onClick={() => updateMutation.reset()}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {showGenericSaveError && (
        <p className="text-sm text-destructive">
          Unable to save changes. Please try again.
        </p>
      )}

      {form && (
        <ContractEditForm
          value={form}
          disabled={updateMutation.isPending}
          onChange={setForm}
        />
      )}
    </div>
  );
}
