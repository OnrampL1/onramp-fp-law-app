import { Building2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function OrganizationSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Organization profile</CardTitle>
        <CardDescription>
          Information used to identify your organization across the workspace.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border bg-muted">
            <Building2 className="size-7 text-muted-foreground" />
          </div>

          <div>
            <p className="text-sm font-medium">Organization logo</p>
            <p className="text-xs text-muted-foreground">
              The logo displayed throughout your workspace.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="organization-name">Organization name</Label>
            <Input
              id="organization-name"
              name="organizationName"
              placeholder="Enter organization name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization-email">Contact email</Label>
            <Input
              id="organization-email"
              name="contactEmail"
              type="email"
              placeholder="contact@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization-phone">Phone number</Label>
            <Input
              id="organization-phone"
              name="phone"
              type="tel"
              placeholder="+1 234 567 890"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization-website">Website</Label>
            <Input
              id="organization-website"
              name="website"
              type="url"
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="organization-address">Address</Label>
            <Textarea
              id="organization-address"
              name="address"
              rows={3}
              placeholder="Enter the organization address"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
