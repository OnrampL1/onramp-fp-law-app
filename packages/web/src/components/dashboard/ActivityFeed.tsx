import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Upload, Sparkles, LinkIcon, UserPlus, RefreshCcw } from "lucide-react";
import { activityFeed, type ActivityType } from "@/lib/data";
import { cn } from "@/lib/utils";

const iconMap: Record<ActivityType, { icon: typeof Upload; cls: string }> = {
  upload: { icon: Upload, cls: "bg-accent text-accent-foreground" },
  analysis: { icon: Sparkles, cls: "bg-primary/10 text-primary" },
  witness: { icon: LinkIcon, cls: "bg-emerald-50 text-emerald-600" },
  user: { icon: UserPlus, cls: "bg-amber-50 text-amber-600" },
  status: { icon: RefreshCcw, cls: "bg-orange-50 text-orange-600" },
};

export function ActivityFeed() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity Feed</CardTitle>
        <CardDescription>Recent actions across your workspace</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-1">
          {activityFeed.map((item, i) => {
            const { icon: Icon, cls } = iconMap[item.type];
            const isLast = i === activityFeed.length - 1;
            return (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full",
                      cls,
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  {!isLast && (
                    <span className="my-1 w-px flex-1 bg-border" aria-hidden />
                  )}
                </div>
                <div className="pb-4">
                  <p className="text-sm leading-snug text-foreground">
                    <span className="font-medium">{item.actor}</span>{" "}
                    <span className="text-muted-foreground">{item.action}</span>{" "}
                    <span className="font-medium">{item.target}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.time}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
