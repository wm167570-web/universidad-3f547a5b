import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, Clock, LogOut, Send, ShieldX, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pending-approval")({
  component: PendingApproval,
});

function PendingApproval() {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [requested, setRequested] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (profile?.is_approved) return <Navigate to="/dashboard" />;

  const handleRequest = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        user_id: user.id,
        display_name: user.user_metadata?.full_name || user.email?.split("@")[0],
        is_approved: false,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

      if (error) throw error;

      setRequested(true);
      toast.success("Solicitud enviada al administrador");
    } catch (err: any) {
      toast.error("No se pudo enviar la solicitud: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDeny = async () => {
    setBusy(true);
    await signOut();
    toast.message("Sesión cerrada");
    // Salida inmediata fuera de la app
    if (typeof window !== "undefined") {
      window.location.replace("https://www.google.com");
    } else {
      navigate({ to: "/login" });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1a0505] p-4 font-sans text-foreground">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div
            className="size-16 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #f97316)",
              boxShadow: "0 0 25px rgba(245, 158, 11, 0.4)",
            }}
          >
            <GraduationCap className="size-10 text-[#1a0505]" />
          </div>
          <h1
            className="text-3xl font-serif tracking-tight brand-text"
            style={{ color: "#fbbf24", letterSpacing: "0.1em" }}
          >
            ACADÉMICO<span style={{ color: "#f97316" }}>PRO</span>
          </h1>
        </div>

        {/* Card */}
        <div
          className="p-8 rounded-2xl border"
          style={{
            background: "rgba(30, 10, 10, 0.4)",
            backdropFilter: "blur(12px)",
            borderColor: "rgba(245, 158, 11, 0.2)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div className="flex justify-center mb-6 text-[#f59e0b]">
            <div className="p-4 rounded-full bg-[#f59e0b]/10">
              {requested ? (
                <CheckCircle2 className="size-12 text-green-400" />
              ) : (
                <Clock className="size-12 animate-pulse" />
              )}
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-3 text-[#fbbf24]">
            {requested ? "Solicitud enviada" : "Solicitar permiso de acceso"}
          </h2>
          <p className="text-sm text-[#d4a574]/70 mb-6 leading-relaxed">
            {requested ? (
              <>
                Hemos notificado al administrador. Recibirás acceso una vez sea aprobada tu cuenta{" "}
                <span className="text-[#fbbf24] font-medium">{user.email}</span>.
              </>
            ) : (
              <>
                Tu correo <span className="text-[#fbbf24] font-medium">{user.email}</span> aún no
                tiene autorización. Envía una solicitud al administrador o sal de la aplicación.
              </>
            )}
          </p>

          {!requested ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-[#1a0505] hover:opacity-90 font-semibold"
                onClick={handleRequest}
                disabled={busy}
              >
                {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Send className="size-4 mr-2" />}
                Solicitar permiso
              </Button>
              <Button
                variant="outline"
                className="w-full border-destructive/40 hover:bg-destructive/10 text-destructive"
                onClick={handleDeny}
                disabled={busy}
              >
                <ShieldX className="size-4 mr-2" />
                Denegar permiso
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full border-[#f59e0b]/30 hover:bg-[#f59e0b]/10 text-[#f59e0b]"
              onClick={() => signOut()}
            >
              <LogOut className="size-4 mr-2" />
              Cerrar sesión
            </Button>
          )}
        </div>

        <p className="text-xs text-[#d4a574]/40 italic">
          Contacto del administrador:{" "}
          <a href="mailto:wmartinezm360@gmail.com" className="text-[#f59e0b] hover:underline">
            wmartinezm360@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
