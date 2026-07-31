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
import type { TeamMember } from "@/lib/users";

type RevokeInvitationDialogProps = {
  invitation: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (invitation: TeamMember) => void;
};

export function RevokeInvitationDialog({
  invitation,
  open,
  onOpenChange,
  onConfirm,
}: RevokeInvitationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke this invitation?</AlertDialogTitle>
          <AlertDialogDescription>
            {invitation
              ? `${invitation.email} won't be able to use this invite link to join anymore. You can send a new invitation later if needed.`
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => invitation && onConfirm(invitation)}
          >
            Revoke invite
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
