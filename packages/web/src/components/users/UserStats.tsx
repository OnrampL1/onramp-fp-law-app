import type { LucideIcon } from "lucide-react";
import { Clock, ShieldCheck, UserRound, UsersRound } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { TeamMember } from "@/lib/users";
import { isAdminRole } from "@/lib/permissions";

type UserStatsProps = {
  users: TeamMember[];
};

type StatItem = {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
};

export function UserStats({ users }: UserStatsProps) {
  // `users` merges real User records with pending Invitation rows (see
  // TeamMember) so the table can show both in one list. Member-count stats
  // must only reflect actual Users — a pending invitation isn't a team
  // member yet — while "Pending invites" is the mirror image and only
  // counts invitation rows.
  const activeUsers = users.filter((user) => user.source === "user");

  const stats: StatItem[] = [
    {
      label: "Team members",
      value: activeUsers.length,
      description: "All workspace accounts",
      icon: UsersRound,
      iconClassName:
        "bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300",
    },
    {
      label: "Administrators",
      value: activeUsers.filter((user) => isAdminRole(user.role)).length,
      description: "Can manage access",
      icon: ShieldCheck,
      iconClassName:
        "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300",
    },
    {
      label: "Internal users",
      value: activeUsers.filter((user) => user.role === "INTERNAL").length,
      description: "Read-only contract access",
      icon: UserRound,
      iconClassName:
        "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300",
    },
    {
      label: "Pending invites",
      value: users.filter((user) => user.source === "invitation").length,
      description: "Awaiting acceptance",
      icon: Clock,
      iconClassName:
        "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <Card key={stat.label} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  {stat.value}
                </p>
              </div>

              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${stat.iconClassName}`}
              >
                <Icon className="size-5" aria-hidden="true" />
              </div>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">
              {stat.description}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
