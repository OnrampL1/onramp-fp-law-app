import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { TimelineEventType } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  Upload,
  RefreshCw,
  Sparkles,
  Link2,
  UserPlus,
  MessageSquare,
} from "lucide-react";

type TimelineEvent = {
  type: TimelineEventType;
  actor: string;
  initials: string;
  action: string;
  detail?: string;
  time: string;
};

const config: Record<
  TimelineEventType,
  { icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  upload: { icon: Upload, className: "bg-blue-50 text-blue-600 ring-blue-100" },
  status: {
    icon: RefreshCw,
    className: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  },
  analysis: {
    icon: Sparkles,
    className: "bg-primary/10 text-primary ring-primary/15",
  },
  witness: {
    icon: Link2,
    className: "bg-amber-50 text-amber-600 ring-amber-100",
  },
  user: {
    icon: UserPlus,
    className: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  },
  note: {
    icon: MessageSquare,
    className: "bg-muted text-muted-foreground ring-border",
  },
};

export function ContractTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <Card className="p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Contract Activity Timeline
        </h2>
        <span className="text-xs text-muted-foreground">
          {events.length} events
        </span>
      </div>
      <p className="mb-5 text-xs text-muted-foreground">
        Full audit trail of every action on this contract
      </p>

      <ol className="relative space-y-6">
        {events.map((event, i) => {
          const { icon: Icon, className } = config[event.type];
          const isLast = i === events.length - 1;
          return (
            <li key={i} className="relative flex gap-4">
              {!isLast && (
                <span
                  className="absolute left-[18px] top-10 h-[calc(100%+0.5rem)] w-px bg-border"
                  aria-hidden
                />
              )}
              <span
                className={cn(
                  "z-10 flex size-9 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                  className,
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{event.actor}</span>{" "}
                    <span className="text-muted-foreground">
                      {event.action}
                    </span>
                  </p>
                  {event.detail && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {event.detail}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Avatar className="size-5 sm:hidden">
                    <AvatarFallback className="bg-accent text-[9px] font-semibold text-accent-foreground">
                      {event.initials}
                    </AvatarFallback>
                  </Avatar>
                  <time className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                    {event.time}
                  </time>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
