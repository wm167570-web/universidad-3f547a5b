import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { GraduationCap, Mail, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — AcadémicoPro" },
      { name: "description", content: "Accede a tu cuenta de AcadémicoPro." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("¡Bienvenido!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: { data: { full_name: name } }
      });
      if (error) throw error;
      toast.success("Cuenta creada exitosamente.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/dashboard`,
      });
      if (result.error) throw result.error;
      // If redirected, browser navigates away. Otherwise session is set.
    } catch (error: any) {
      toast.error(error?.message ?? "Error al iniciar con Google");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Hero lateral */}
      <div className="hidden lg:flex flex-col justify-between p-12 text-primary-foreground relative overflow-hidden"
        style={{ background: "var(--gradient-primary)" }}>
        <div className="flex items-center gap-3 relative z-10">
          <div className="size-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
            <GraduationCap className="size-6" />
          </div>
          <span className="font-serif text-2xl">AcadémicoPro</span>
        </div>
        <div className="relative z-10">
          <h1 className="font-serif text-4xl xl:text-5xl leading-tight mb-4">
            Tu vida académica,<br/>organizada con propósito.
          </h1>
          <p className="text-primary-foreground/85 text-lg max-w-md">
            Materias, calificaciones, trabajos, tesis y productividad. Todo en un solo lugar.
          </p>
        </div>
        <div className="text-sm text-primary-foreground/70 relative z-10">
          © {new Date().getFullYear()} AcadémicoPro
        </div>
        <div className="absolute -bottom-32 -right-32 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -top-20 -left-20 size-72 rounded-full bg-white/10 blur-3xl" />
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="size-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <GraduationCap className="size-5" />
            </div>
            <span className="font-serif text-xl">AcadémicoPro</span>
          </div>

          <h2 className="font-serif text-3xl mb-2">Bienvenido</h2>
          <p className="text-muted-foreground mb-8">Inicia sesión o crea una cuenta para continuar.</p>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <Field id="email" label="Correo" icon={<Mail className="size-4" />}>
                  <Input id="email" type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
                </Field>
                <Field id="password" label="Contraseña" icon={<Lock className="size-4" />}>
                  <Input id="password" type="password" required value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </Field>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <Field id="name" label="Nombre completo">
                  <Input id="name" required value={name}
                    onChange={(e) => setName(e.target.value)} placeholder="Ana Pérez" />
                </Field>
                <Field id="email2" label="Correo" icon={<Mail className="size-4" />}>
                  <Input id="email2" type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
                </Field>
                <Field id="password2" label="Contraseña" icon={<Lock className="size-4" />}>
                  <Input id="password2" type="password" required minLength={6} value={password}
                    onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </Field>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : "Crear cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">o</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button type="button" variant="outline" onClick={handleGoogle} disabled={busy} className="w-full">
            <GoogleIcon /> Continuar con Google
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, icon, children }: { id: string; label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm flex items-center gap-1.5">
        {icon}{label}
      </Label>
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4 mr-2" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.5-1.7 4.3-5.5 4.3-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.7 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12s4.1 9.2 9.2 9.2c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1-.2-1.5H12z"/>
    </svg>
  );
}
