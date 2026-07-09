import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Scale,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  ScrollText,
  FileLock2,
  FileText,
  Sparkles,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const features = [
  {
    icon: FileText,
    title: "Contract Management",
    description:
      "Store, organize, and track contracts from a centralized workspace.",
  },
  {
    icon: Sparkles,
    title: "AI Legal Copilot",
    description:
      "Generate summaries, identify risks, and investigate clauses in plain English.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Security",
    description:
      "Role-based access control, audit logging, secure witness access, and protected document storage.",
  },
];

const trustIndicators = [
  "RBAC Protected",
  "Audit Logging Enabled",
  "Encrypted Storage",
  "AI Assisted",
];

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data.email, data.password);
      navigate("/dashboard");
    } catch {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="fixed inset-0 flex w-full bg-background">
      {/* Left branding panel */}
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary px-10 py-12 text-primary-foreground lg:flex xl:px-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative flex items-center gap-3">
          <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary-foreground/10 ring-1 ring-primary-foreground/20">
            <Scale className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-lg font-semibold tracking-tight">Clausio</p>
            <p className="text-xs text-primary-foreground/60">
              Legal Intelligence
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Badge
            variant="outline"
            className="mb-6 border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground/80 rounded-full px-3 py-3 text-xs font-medium"
          >
            AI-Powered Contract Intelligence
          </Badge>
          <h1 className="text-pretty text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            The intelligent workspace for modern legal teams.
          </h1>
          <p className="mt-4 text-pretty text-sm leading-relaxed text-primary-foreground/70">
            Securely manage contracts, monitor lifecycle events, and understand
            legal agreements with AI-powered analysis.
          </p>

          <div className="mt-10 flex flex-col gap-5">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3.5">
                <div className="mt-0.5 flex aspect-square size-9 items-center justify-center rounded-md bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
                  <feature.icon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-primary-foreground/60">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex flex-wrap gap-2">
          {trustIndicators.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 px-3 py-1 text-xs text-primary-foreground/70"
            >
              <ShieldCheck className="size-3" />
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* Right authentication panel */}
      <section className="flex w-full flex-col items-center justify-center overflow-y-auto px-5 py-10 sm:px-8 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Scale className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="text-base font-semibold tracking-tight">Clausio</p>
              <p className="text-xs text-muted-foreground">
                Legal Intelligence
              </p>
            </div>
          </div>

          <Card className="shadow-sm">
            <CardHeader className="space-y-1.5">
              <CardTitle className="text-xl tracking-tight">
                Welcome Back
              </CardTitle>
              <CardDescription>
                Sign in to access your contract workspace.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <CardContent className="flex flex-col gap-5">
                {error && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      className="pl-9"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertCircle className="size-3.5" />
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="px-9"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertCircle className="size-3.5" />
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </CardContent>

              <CardFooter>
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link to="/register" className="text-primary hover:underline">
                    Register
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>

          {/* Security notice */}
          <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <FileLock2 className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Security Notice
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  This platform contains sensitive contract and legal
                  information. Access is monitored and audited.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[
                    { label: "Secure Authentication", icon: ShieldCheck },
                    { label: "Audit Logging", icon: ScrollText },
                    { label: "Encrypted Access", icon: Lock },
                  ].map((item) => (
                    <span
                      key={item.label}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      <item.icon className="size-3" />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
