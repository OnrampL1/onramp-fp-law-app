import { useState } from "react";
import { Link } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { submitAccessRequest } from "../services/access-request.service";
import type { AccessRequestCompanySize } from "../types/access-request";

const COMPANY_SIZE_OPTIONS: Array<{
  value: AccessRequestCompanySize;
  label: string;
}> = [
  { value: "ONE_TO_TEN", label: "1-10" },
  { value: "ELEVEN_TO_FIFTY", label: "11-50" },
  { value: "FIFTY_ONE_TO_TWO_HUNDRED", label: "51-200" },
  { value: "TWO_HUNDRED_ONE_TO_ONE_THOUSAND", label: "201-1,000" },
  { value: "ONE_THOUSAND_PLUS", label: "1,000+" },
];

const requestAccessSchema = z.object({
  contactFirstName: z.string().trim().min(1, "First name is required").max(80),
  contactLastName: z.string().trim().min(1, "Last name is required").max(80),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .max(254),
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name is required")
    .max(120),
  websiteUrl: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine(
      (value) => {
        if (!value) return true;

        try {
          const url = new URL(value);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Website must be a valid HTTP or HTTPS URL" },
    ),
  companySize: z
    .enum([
      "ONE_TO_TEN",
      "ELEVEN_TO_FIFTY",
      "FIFTY_ONE_TO_TWO_HUNDRED",
      "TWO_HUNDRED_ONE_TO_ONE_THOUSAND",
      "ONE_THOUSAND_PLUS",
    ])
    .optional(),
  country: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value ? value : undefined)),
  intendedUse: z
    .string()
    .trim()
    .min(10, "Tell us a little more about your intended use")
    .max(1000),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => (value ? value : undefined)),
  website: z.string().max(0).optional(),
});

type RequestAccessFormData = z.infer<typeof requestAccessSchema>;

function fieldError(message?: string) {
  if (!message) return null;

  return <p className="text-xs text-destructive">{message}</p>;
}

export function RequestAccess() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RequestAccessFormData>({
    resolver: zodResolver(requestAccessSchema),
    defaultValues: {
      contactFirstName: "",
      contactLastName: "",
      contactEmail: "",
      organizationName: "",
      websiteUrl: "",
      companySize: undefined,
      country: "",
      intendedUse: "",
      notes: "",
      website: "",
    },
  });

  async function onSubmit(data: RequestAccessFormData) {
    try {
      setSubmitError(null);
      const result = await submitAccessRequest(data);
      setSuccessMessage(result.message);
    } catch {
      setSubmitError("We could not submit your request. Please try again.");
    }
  }

  if (successMessage) {
    return (
      <main className="min-h-screen bg-background px-4 py-10 text-foreground">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl items-center">
          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <CheckCircle2 className="size-5" />
              </div>
              <CardTitle>Request received</CardTitle>
              <CardDescription>{successMessage}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button render={<Link to="/">Return to Clausio</Link>} />
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Clausio
        </Link>

        <Card>
          <CardHeader>
            <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <CardTitle>Request access</CardTitle>
            <CardDescription>
              Submit your organization for review by the Clausio platform team.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form
              className="flex flex-col gap-5"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                aria-hidden="true"
                {...register("website")}
              />

              {submitError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {submitError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="contact-first-name">First name</Label>
                  <Input
                    id="contact-first-name"
                    autoComplete="given-name"
                    maxLength={80}
                    {...register("contactFirstName")}
                  />
                  {fieldError(errors.contactFirstName?.message)}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="contact-last-name">Last name</Label>
                  <Input
                    id="contact-last-name"
                    autoComplete="family-name"
                    maxLength={80}
                    {...register("contactLastName")}
                  />
                  {fieldError(errors.contactLastName?.message)}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="contact-email">Work email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  {...register("contactEmail")}
                />
                {fieldError(errors.contactEmail?.message)}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="organization-name">Organization name</Label>
                  <Input
                    id="organization-name"
                    autoComplete="organization"
                    maxLength={120}
                    {...register("organizationName")}
                  />
                  {fieldError(errors.organizationName?.message)}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="website-url">Website</Label>
                  <Input
                    id="website-url"
                    type="url"
                    placeholder="https://example.com"
                    maxLength={200}
                    {...register("websiteUrl")}
                  />
                  {fieldError(errors.websiteUrl?.message)}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="company-size">Company size</Label>
                  <Select
                    onValueChange={(value) =>
                      setValue(
                        "companySize",
                        value as AccessRequestCompanySize,
                        { shouldValidate: true },
                      )
                    }
                  >
                    <SelectTrigger id="company-size">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldError(errors.companySize?.message)}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    autoComplete="country-name"
                    maxLength={80}
                    {...register("country")}
                  />
                  {fieldError(errors.country?.message)}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="intended-use">Intended use</Label>
                <Textarea
                  id="intended-use"
                  maxLength={1000}
                  className="min-h-28"
                  {...register("intendedUse")}
                />
                {fieldError(errors.intendedUse?.message)}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="notes">Additional notes</Label>
                <Textarea
                  id="notes"
                  maxLength={1000}
                  className="min-h-24"
                  {...register("notes")}
                />
                {fieldError(errors.notes?.message)}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <Button variant="outline" render={<Link to="/">Cancel</Link>} />
                <Button type="submit" className="gap-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Submitting
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Submit request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
