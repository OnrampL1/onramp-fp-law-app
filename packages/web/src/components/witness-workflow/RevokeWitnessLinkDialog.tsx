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
import type { WitnessLinkListItem } from "@/types/witness";

interface RevokeWitnessLinkDialogProps {
  invitation: WitnessLinkListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (invitation: WitnessLinkListItem) => void;
  isPending?: boolean;
}

export function RevokeWitnessLinkDialog({
  invitation,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: RevokeWitnessLinkDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke this witness link?</AlertDialogTitle>
          <AlertDialogDescription>
            {invitation
              ? `${invitation.witnessName ?? invitation.witnessEmail} will immediately lose access to ${invitation.contractTitle}, even if they're mid-session right now. This can't be undone.`
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={() => invitation && onConfirm(invitation)}
          >
            {isPending ? "Revoking…" : "Revoke access"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
