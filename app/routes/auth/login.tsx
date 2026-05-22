import { redirect, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "~/components/ui/Input";
import { Button } from "~/components/ui/Button";
import { useAuthStore } from "~/stores/authStore";
import { getStoredAuth } from "~/stores/authStore";
import * as authService from "~/services/auth";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginData = z.infer<typeof loginSchema>;

export function clientLoader() {
  const auth = getStoredAuth();
  if (auth?.token && auth?.user) {
    return redirect(auth.user.role === "admin" ? "/admin" : "/client");
  }
  return null;
}

export function meta() {
  return [{ title: "Sign in — Buhata" }];
}

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginData) => {
    try {
      const { access_token } = await authService.login(data.email, data.password);
      const user = await authService.getMe(access_token);
      setAuth(access_token, user);
      navigate(user.role === "admin" ? "/admin" : "/client", { replace: true });
    } catch {
      setError("root", {
        message: "Invalid email or password. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-dark-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber mb-4 shadow-lg shadow-amber/20">
            <span className="font-display text-xl font-bold text-white">B</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-cream tracking-wide">
            Buhata
          </h1>
          <p className="mt-1 text-xs text-cream/35 tracking-widest uppercase">
            Internal Dashboard
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-cream/8 bg-navy/15 p-6 shadow-2xl backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-cream">Sign in</h2>
          <p className="mt-0.5 text-xs text-cream/40">
            Enter your credentials to continue.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@buhata.com"
              autoComplete="email"
              autoFocus
              {...register("email")}
              error={errors.email?.message}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("password")}
              error={errors.password?.message}
            />

            {errors.root && (
              <div className="rounded-lg border border-terracotta/20 bg-terracotta/8 px-3 py-2.5 text-xs text-terracotta">
                {errors.root.message}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              loading={isSubmitting}
              className="w-full mt-2"
            >
              Sign in
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-cream/20">
          © {new Date().getFullYear()} Buhata. All rights reserved.
        </p>
      </div>
    </div>
  );
}
