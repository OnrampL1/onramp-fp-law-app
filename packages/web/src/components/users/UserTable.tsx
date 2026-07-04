import {
  Ban,
  Mail,
  MoreHorizontal,
  RotateCcw,
  ShieldCheck,
  UserCog,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getInitials, type TeamMember } from "@/lib/users";

import { PermissionBadge, UserRoleBadge, UserStatusBadge } from "./UserBadges";

type UserTableProps = {
  users: TeamMember[];
  onSelectUser: (user: TeamMember) => void;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function UserTable({ users, onSelectUser }: UserTableProps) {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead>Last active</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-12 pr-4 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {users.map((user) => {
            const visiblePermissions = user.permissionKeys.slice(0, 2);
            const hiddenPermissionCount =
              user.permissionKeys.length - visiblePermissions.length;

            return (
              <TableRow
                key={user.id}
                onClick={() => onSelectUser(user)}
                className="cursor-pointer"
              >
                <TableCell className="pl-4">
                  <div className="flex min-w-56 items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {user.name}
                      </p>
                      <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="size-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <UserRoleBadge role={user.role} />
                </TableCell>

                <TableCell>
                  <UserStatusBadge status={user.status} />
                </TableCell>

                <TableCell>
                  <div className="flex min-w-64 flex-wrap gap-1.5">
                    {visiblePermissions.map((permission) => (
                      <PermissionBadge
                        key={permission}
                        permission={permission}
                      />
                    ))}

                    {hiddenPermissionCount > 0 && (
                      <span className="inline-flex h-5 items-center rounded-full border border-border px-2 text-xs font-medium text-muted-foreground">
                        +{hiddenPermissionCount}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-muted-foreground">
                  {formatDate(user.lastActiveAt)}
                </TableCell>

                <TableCell className="text-muted-foreground">
                  {formatDate(user.createdAt)}
                </TableCell>

                <TableCell
                  className="pr-4 text-right"
                  onClick={(event) => event.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${user.name}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />

                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem>
                        <UserCog className="size-4" />
                        Change role
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSelectUser(user)}>
                        <ShieldCheck className="size-4" />
                        Review permissions
                      </DropdownMenuItem>
                      {user.status === "pending" && (
                        <DropdownMenuItem>
                          <RotateCcw className="size-4" />
                          Resend invite
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive">
                        <Ban className="size-4" />
                        Disable access
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {users.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-1 px-4 py-14 text-center">
          <p className="text-sm font-medium">No users found</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting the search or role filters.
          </p>
        </div>
      )}
    </Card>
  );
}
