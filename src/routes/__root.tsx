import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AcadémicoPro — Gestión académica integral" },
      { name: "description", content: "LMS Maestria" },
      { property: "og:title", content: "AcadémicoPro — Gestión académica integral" },
      { property: "og:description", content: "LMS Maestria" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "AcadémicoPro — Gestión académica integral" },
      { name: "twitter:description", content: "LMS Maestria" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/p4ZsQ3xWbSdWHspcTwr8BRxujG92/social-images/social-1776630440424-Logo_Ucentral.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/p4ZsQ3xWbSdWHspcTwr8BRxujG92/social-images/social-1776630440424-Logo_Ucentral.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Rajdhani:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useAuth } from "@/hooks/useAuth";
import { useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

function RealtimeSync() {
  useRealtimeSync();
  return null;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, role, loading } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const [fallbackTimeout, setFallbackTimeout] = useState(false);

  useEffect(() => {
    if (!loading) {
      setFallbackTimeout(false);
      return;
    }
    const t = setTimeout(() => setFallbackTimeout(true), 3500);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (loading) return;

    const path = location.pathname;
    const isAuthPage = path === "/login";
    const isPending = path === "/pending-approval";

    if (!user) {
      if (!isAuthPage) navigate({ to: "/login" });
      return;
    }

    // Usuario logueado pero NO aprobado → solo pantalla de solicitud
    if (profile && profile.is_approved === false) {
      if (!isPending) navigate({ to: "/pending-approval" });
      return;
    }

    // Aprobado en pantalla de pending → al dashboard
    if (profile?.is_approved && (isPending || isAuthPage)) {
      navigate({ to: "/dashboard" });
      return;
    }

    // Bloqueo del módulo admin para no-admins
    if (path.startsWith("/admin") && role !== "admin") {
      navigate({ to: "/dashboard" });
      return;
    }
  }, [user, profile, role, loading, location.pathname, navigate]);

  const isAuthPage = location.pathname === "/login";

  if (loading && !isAuthPage && !fallbackTimeout) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a0505]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-amber-200/60 uppercase tracking-widest">Cargando sesión…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function RootComponent() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGuard>
          <RealtimeSync />
          <Outlet />
          <Toaster richColors position="top-right" />
        </AuthGuard>
      </AuthProvider>
    </QueryClientProvider>
  );
}
