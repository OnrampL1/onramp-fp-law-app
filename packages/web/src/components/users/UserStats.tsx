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
};

export function UserStats({ users }: UserStatsProps) {
  const stats: StatItem[] = [
    {
      label: "Team members",
      value: users.length,
      description: "All workspace accounts",
      icon: UsersRound,
    },
    {
      label: "Administrators",
      value: users.filter((user) => isAdminRole(user.role)).length,
      description: "Can manage access",
      icon: ShieldCheck,
    },
    {
      label: "Internal users",
      value: users.filter((user) => user.role === "INTERNAL").length,
      description: "Read-only contract access",
      icon: UserRound,
    },
    {
      label: "Pending invites",
      value: users.filter((user) => user.status === "pending").length,
      description: "Awaiting acceptance",
      icon: Clock,
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

              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
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
