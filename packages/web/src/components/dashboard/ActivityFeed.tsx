import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  AlertCircle,
  Building2,
  FileText,
  NotebookPen,
  ScrollText,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLogsList } from "@/hooks/useAuditLogsList";
import { isAdminRole } from "@/lib/permissions";
import { cn, formatRelativeTime } from "@/lib/utils";
import { listUsers, type ApiUser } from "@/services/users.service";
import {
  AUDIT_ACTION_GROUP,
  AUDIT_ACTION_LABELS,
  type AuditActionGroup,
  type AuditLogEntry,
} from "@/types/audit";

const GROUP_ICONS: Record<
  AuditActionGroup,
  { icon: typeof FileText; cls: string }
> = {
  Organization: {
    icon: Building2,
    cls: "bg-indigo-50 text-indigo-600",
  },
  User: {
    icon: Users,
    cls: "bg-blue-50 text-blue-600",
  },
  Contract: {
    icon: FileText,
    cls: "bg-emerald-50 text-emerald-600",
  },
  Note: {
    icon: NotebookPen,
    cls: "bg-teal-50 text-teal-600",
  },
  Witness: {
    icon: UserPlus,
    cls: "bg-purple-50 text-purple-600",
  },
  AI: {
    icon: Sparkles,
    cls: "bg-orange-50 text-orange-600",
  },
  Platform: {
    icon: ShieldAlert,
    cls: "bg-muted text-muted-foreground",
  },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getActorName(
  entry: AuditLogEntry,
  usersById: Map<string, ApiUser>,
): string {
  if (entry.actorType === "SYSTEM") return "System";
  if (entry.actorType === "PLATFORM_USER") return "Platform Support";

  const user = entry.actorUserId ? usersById.get(entry.actorUserId) : undefined;

  return user?.fullName ?? "Team member";
}

function getTargetName(entry: AuditLogEntry): string {
  if (entry.targetDisplayName) return entry.targetDisplayName;

  if (entry.targetEntityType === "AIAnalysis") return "AI analysis";
  if (entry.targetEntityType === "WitnessInvitation") {
    return "witness invitation";
  }

  return entry.targetEntityType.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function buildActivitySentence(
  entry: AuditLogEntry,
  usersById: Map<string, ApiUser>,
): {
  actor: string;
  initials: string;
  action: string;
  target: string;
} {
  const actor = getActorName(entry, usersById);
  const initials =
    actor === "System"
      ? "SY"
      : actor === "Platform Support"
        ? "PS"
        : getInitials(actor);

  return {
    actor,
    initials,
    action: AUDIT_ACTION_LABELS[entry.action].toLowerCase(),
    target: getTargetName(entry),
  };
}

export function ActivityFeed() {
  const { user } = useAuth();
  const canReadAuditLogs = isAdminRole(user?.role);
  const organizationId = canReadAuditLogs ? user?.organizationId : undefined;

  const auditParams = {
    page: 1,
    limit: 6,
  };

  const {
    data: auditData,
    isLoading,
    isError,
    refetch,
  } = useAuditLogsList(organizationId, auditParams);

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
    enabled: canReadAuditLogs,
  });

  const usersById = useMemo(
    () =>
      new Map((users ?? []).map((listedUser) => [listedUser.id, listedUser])),
    [users],
  );

  const entries = auditData?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity Feed</CardTitle>
        <CardDescription>
          Recent audited actions across your workspace
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!canReadAuditLogs ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border p-8 text-center">
            <ScrollText className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Activity feed is restricted
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Workspace audit activity is available to the organization Owner
              and Administrators.
            </p>
          </div>
        ) : isLoading ? (
          <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            Loading activity...
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border p-8 text-center">
            <AlertCircle className="size-6 text-destructive" />
            <p className="text-sm text-muted-foreground">
              We couldn't load recent activity.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            No audited activity yet.
          </div>
        ) : (
          <ol className="relative space-y-1">
            {entries.map((entry, index) => {
              const group = AUDIT_ACTION_GROUP[entry.action];
              const { icon: Icon, cls } = GROUP_ICONS[group];
              const item = buildActivitySentence(entry, usersById);
              const isLast = index === entries.length - 1;

              return (
                <li key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        cls,
                      )}
                      title={item.initials}
                    >
                      <Icon className="size-4" />
                    </div>
                    {!isLast && (
                      <span
                        className="my-1 w-px flex-1 bg-border"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm leading-snug text-foreground">
                      <span className="font-medium">{item.actor}</span>{" "}
                      <span className="text-muted-foreground">
                        {item.action}
                      </span>{" "}
                      <span className="font-medium">{item.target}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelativeTime(entry.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
