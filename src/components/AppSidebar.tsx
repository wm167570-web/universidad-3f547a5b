import { Link, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, BookOpen, FileText, Microscope,
  LogOut, GraduationCap, Zap, Shield, Menu
} from "lucide-react";
import { useState, useEffect, type CSSProperties } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; disabled?: boolean };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/materias",  label: "Gestión Académica",  icon: BookOpen },
  { to: "/produccion", label: "Producción", icon: FileText },
  { to: "/tesis", label: "Tesis", icon: Microscope },
];

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const { user, role, signOut } = useAuth();

  return (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "rgba(245, 158, 11, 0.15)" }}>
        <div className="flex items-center gap-3">
          <div
            className="size-9 rounded flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #f97316)",
              boxShadow: "0 0 12px rgba(245, 158, 11, 0.5)",
            }}
          >
            <GraduationCap className="size-5 text-[#1a0505]" />
          </div>
          <div>
            <div
              className="font-serif text-base leading-none brand-text"
              style={{ color: "#fbbf24", letterSpacing: "0.08em" }}
            >
              ACADÉMICO<span style={{ color: "#f97316" }}>PRO</span>
            </div>
            <div className="text-[10px] mt-1 uppercase tracking-widest" style={{ color: "rgba(212, 165, 116, 0.6)" }}>
              Gestión integral
            </div>
          </div>
        </div>
      </div>

      {/* ── Navegación ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-widest px-3 pb-2 pt-1"
          style={{ color: "rgba(212, 165, 116, 0.5)" }}>
          Módulos
        </p>

        {NAV.map(({ to, label, icon: Icon, disabled }) => {
          const active = pathname === to || pathname.startsWith(to + "/");

          if (disabled) {
            return (
              <div
                key={to}
                className="flex items-center gap-3 px-3 py-2.5 rounded text-xs uppercase tracking-wider cursor-not-allowed"
                style={{ color: "rgba(212, 165, 116, 0.3)" }}
                title="Próximamente"
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{label}</span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-widest"
                  style={{ background: "rgba(245, 158, 11, 0.1)", color: "rgba(245, 158, 11, 0.4)", border: "1px solid rgba(245, 158, 11, 0.15)" }}
                >
                  Pronto
                </span>
              </div>
            );
          }

          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2.5 rounded text-xs uppercase tracking-wider transition-all group"
              style={
                active
                  ? {
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "#fbbf24",
                      borderLeft: "2px solid #f59e0b",
                      boxShadow: "inset 0 0 12px rgba(245, 158, 11, 0.05), 0 0 8px rgba(245, 158, 11, 0.1)",
                    }
                  : {
                      color: "rgba(212, 165, 116, 0.7)",
                      borderLeft: "2px solid transparent",
                    }
              }
            >
              <Icon
                className="size-4 shrink-0 transition-all"
                style={active ? { filter: "drop-shadow(0 0 4px rgba(245, 158, 11, 0.8))" } : {}}
              />
              <span className="flex-1">{label}</span>
              {active && (
                <Zap className="size-3" style={{ color: "#f59e0b", filter: "drop-shadow(0 0 4px rgba(245, 158, 11, 0.8))" }} />
              )}
            </Link>
          );
        })}

        {role === "admin" && (
          <>
            <p className="text-[10px] uppercase tracking-widest px-3 pb-2 pt-4"
              style={{ color: "rgba(245, 158, 11, 0.6)" }}>
              Configuración
            </p>
            <Link
              to="/admin"
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2.5 rounded text-xs uppercase tracking-wider transition-all group"
              style={
                pathname === "/admin"
                  ? {
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "#fbbf24",
                      borderLeft: "2px solid #f59e0b",
                    }
                  : {
                      color: "rgba(212, 165, 116, 0.7)",
                      borderLeft: "2px solid transparent",
                    }
              }
            >
              <Shield className="size-4 shrink-0 transition-all" />
              <span className="flex-1">Administración</span>
            </Link>
          </>
        )}
      </nav>

      <div className="p-3 border-t" style={{ borderColor: "rgba(245, 158, 11, 0.12)" }}>
        <div
          className="px-3 py-2 mb-2 rounded"
          style={{ background: "rgba(74, 4, 4, 0.4)", border: "1px solid rgba(245, 158, 11, 0.1)" }}
        >
          <div className="text-[10px] uppercase tracking-wider flex items-center justify-between" style={{ color: "rgba(212, 165, 116, 0.5)" }}>
            <span>Conectado como</span>
            {role === "admin" && (
              <span className="text-[9px] px-1 bg-primary/20 text-primary rounded border border-primary/20 font-bold">
                ADMIN
              </span>
            )}
          </div>
          <div className="text-xs truncate mt-0.5" style={{ color: "#d4a574" }}>
            {user?.email}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-xs uppercase tracking-wider transition-all"
          style={{ color: "rgba(212, 165, 116, 0.6)" }}
        >
          <LogOut className="size-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}

const sidebarSurface: CSSProperties = {
  background: "rgba(15, 2, 2, 0.95)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderColor: "rgba(245, 158, 11, 0.2)",
};

export function AppSidebar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  // Cerrar el sheet al cambiar de ruta
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop */}
      <aside
        className="hidden md:flex w-64 flex-col border-r"
        style={sidebarSurface}
      >
        <SidebarInner />
      </aside>

      {/* Mobile: trigger flotante + Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Abrir menú"
            className="md:hidden fixed top-3 left-3 z-50 flex items-center justify-center size-10 rounded-md border shadow-lg"
            style={{
              background: "rgba(15, 2, 2, 0.92)",
              borderColor: "rgba(245, 158, 11, 0.35)",
              color: "#fbbf24",
            }}
          >
            <Menu className="size-5" />
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="p-0 w-72 border-r"
          style={sidebarSurface}
        >
          <SidebarInner onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
