import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MoreHorizontal,
  Eye,
  Pencil,
  Sparkles,
  Link2,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useDeleteContract } from "@/hooks/useContractDetail";
import { isAdminRole } from "@/lib/permissions";

interface ContractRowActionsProps {
  id: string;
  title: string;
  version: number;
}

export function ContractRowActions({
  id,
  title,
  version,
}: ContractRowActionsProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canDelete = isAdminRole(user?.role);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const deleteContract = useDeleteContract(id);

  function handleConfirmDelete() {
    deleteContract.mutate(
      { version },
      { onSuccess: () => setDeleteOpen(false) },
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              aria-label="Contract actions"
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem render={<Link to={`/contracts/${id}`} />}>
            <Eye className="size-4" />
            View Contract
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to={`/contracts/${id}/edit`} />}>
            <Pencil className="size-4" />
            Edit Metadata
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to={`/contracts/${id}/analysis`} />}>
            <Sparkles className="size-4" />
            View AI Analysis
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate(`/witness-workflow?contractId=${id}`)}
          >
            <Link2 className="size-4" />
            Generate Witness Link
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Delete Contract
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && !deleteContract.isPending) {
            setDeleteOpen(false);
            setConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contract?</AlertDialogTitle>
            <AlertDialogDescription>
              {title} will be permanently deleted and can never be
              recovered. Type the contract name below to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="delete-contract-confirm-name">
              Type{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
                {title}
              </code>{" "}
              to confirm
            </Label>
            <Input
              id="delete-contract-confirm-name"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder="Contract name"
              autoComplete="off"
              disabled={deleteContract.isPending}
            />
          </div>

          {deleteContract.isError && (
            <p className="text-sm text-destructive">
              Couldn't delete this contract. Reload and try again.
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteContract.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteContract.isPending || confirmText !== title}
              onClick={(event) => {
                event.preventDefault();
                handleConfirmDelete();
              }}
            >
              {deleteContract.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting
                </>
              ) : (
                "Delete contract"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
