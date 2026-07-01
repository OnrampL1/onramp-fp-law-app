import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ContractDetail } from "@/lib/data";
import {
  Building2,
  Calendar,
  CalendarClock,
  FileText,
  Hash,
  DollarSign,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/badges";

export function ContractMetadata({ contract: c }: { contract: ContractDetail }) {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-foreground">
        Contract Metadata
      </h2>
      <Separator className="my-4" />

      <dl className="space-y-4">
        <Field icon={FileText} label="Contract Name">
          <span className="font-medium text-foreground">{c.name}</span>
        </Field>
        <Field icon={Building2} label="Counterparty">
          {c.counterparty}
        </Field>
        <Field icon={Hash} label="Contract ID">
          <span className="font-mono text-xs">{c.id}</span>
        </Field>
        <Field icon={DollarSign} label="Contract Value">
          <span className="font-medium text-foreground">{c.value}</span>
        </Field>

        <div className="flex items-start justify-between gap-3">
          <dt className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <FileText className="size-3.5" />
            </span>
            Status
          </dt>
          <dd>
            <StatusBadge status={c.status} />
          </dd>
        </div>

        <Field icon={Calendar} label="Effective Date">
          {c.effective}
        </Field>
        <Field icon={CalendarClock} label="Expiration Date">
          <span className="font-medium text-foreground">{c.expiration}</span>
        </Field>
      </dl>

      <Separator className="my-4" />

      <div>
        <dt className="mb-2 text-sm text-muted-foreground">Tags</dt>
        <dd className="flex flex-wrap gap-1.5">
          {c.tags.map((t) => (
            <Badge key={t} variant="secondary" className="font-medium">
              {t}
            </Badge>
          ))}
        </dd>
      </div>

      <Separator className="my-4" />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-sm text-muted-foreground">Uploaded By</dt>
          <dd className="flex items-center gap-2">
            <Avatar className="size-6">
              <AvatarFallback className="bg-primary text-[10px] font-semibold text-primary-foreground">
                {c.uploadedBy.initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground">
              {c.uploadedBy.name}
            </span>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-sm text-muted-foreground">Created Date</dt>
          <dd className="text-sm text-foreground">{c.created}</dd>
        </div>
      </div>
    </Card>
  );
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Icon className="size-3.5" />
        </span>
        {label}
      </dt>
      <dd className="text-right text-sm text-foreground">{children}</dd>
    </div>
  );
}
