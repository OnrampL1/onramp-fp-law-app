import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { usePlatformAuth } from "../../hooks/usePlatformAuth";

const platformLoginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type PlatformLoginFormData = z.infer<typeof platformLoginSchema>;

export function PlatformLogin() {
  const { platformLogin, platformUser, isPlatformLoading } = usePlatformAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PlatformLoginFormData>({
    resolver: zodResolver(platformLoginSchema),
  });

  useEffect(() => {
    if (!isPlatformLoading && platformUser) {
      navigate("/platform/organizations", { replace: true });
    }
  }, [isPlatformLoading, navigate, platformUser]);

  const onSubmit = async (data: PlatformLoginFormData) => {
    try {
      setError(null);
      await platformLogin(data.email, data.password);
      navigate("/platform/organizations", { replace: true });
    } catch {
      setError("Invalid platform credentials");
    }
  };

  if (isPlatformLoading || platformUser) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background px-5">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scale className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-lg font-semibold tracking-tight">Clausio</p>
            <p className="text-xs text-muted-foreground">Platform Console</p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="space-y-1.5">
            <CardTitle className="text-xl tracking-tight">
              Platform Sign In
            </CardTitle>
            <CardDescription>
              Access the platform management console.
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
                <Label htmlFor="platform-email">Email Address</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="platform-email"
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
                <Label htmlFor="platform-password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="platform-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="px-9"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
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
          </form>
        </Card>

        <div className="mt-5 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Platform Access
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Platform roles are separate from organization workspace roles.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
