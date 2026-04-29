import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const SUPER_ADMINS = ["wmartinezm360@gmail.com", "lauradanielagaleanomoton@gmail.com"];

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: any | null;
  role: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const checkWhitelist = async (u: User) => {
    const mainAdmin = "wmartinezm360@gmail.com";
    
    // 1. Excepción Mandatoria: Super Admins
    if (SUPER_ADMINS.includes(u.email ?? "")) {
      return true;
    }

    try {
      // 2. Intentar llamar a funciones de la DB has_role y is_member
      // Intentamos has_role primero (asumiendo que devuelve boolean)
      const { data: hasRole, error: roleError } = await supabase.rpc('has_role', { 
        _user_id: u.id, 
        _role: 'admin' 
      });

      if (!roleError && hasRole) return true;

      // is_member RPC no existe en los tipos generados; se omite y se cae al fallback de tabla.

      // Si las funciones fallan o no existen, fallback a consulta de tabla user_roles
      const { data, error: tableError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.id)
        .maybeSingle();

      if (!tableError && data) return true;

    } catch (err) {
      console.error("Error detectado en funciones de seguridad:", err);
      // Fallback Mandatorio: Si el sistema falla, permitir acceso al admin principal
      if (u.email === mainAdmin) return true;
    }

    // Fallback Final para evitar bloqueos del admin principal
    if (u.email === mainAdmin) return true;

    console.warn("Acceso denegado: Usuario no autorizado.");
    
    // Expulsión Inmediata
    await supabase.auth.signOut();
    
    toast.error("Usuario no autorizado, solicita autorización a William", {
      duration: 10000,
    });
    
    return false;
  };

  // Perfil con React Query para caching y velocidad
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const [pRes, rRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).single()
      ]);

      const isOwner = SUPER_ADMINS.includes(user.email ?? "");
      
      const profileData: any = pRes.data || {};
      if (isOwner) {
        profileData.is_approved = true;
      }

      return {
        profile: profileData,
        role: isOwner ? "admin" : (rRes.data?.role ?? null)
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });

  useEffect(() => {
    // Escuchar cambios de auth una sola vez
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession?.user) {
        const authorized = await checkWhitelist(newSession.user);
        if (!authorized) {
          setSession(null);
          setUser(null);
          setAuthLoading(false);
          return;
        }
      }
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setAuthLoading(false);
    });

    // Sesión inicial
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s?.user) {
        const authorized = await checkWhitelist(s.user);
        if (!authorized) {
          setSession(null);
          setUser(null);
          setAuthLoading(false);
          return;
        }
      }
      setSession(s);
      setUser(s?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const loading = authLoading || (!!user && profileLoading);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile: profileData?.profile || null, 
      role: profileData?.role || null, 
      loading, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return { 
      user: null, 
      session: null, 
      profile: null, 
      role: null, 
      loading: true, 
      signOut: async () => {} 
    } satisfies AuthContextValue;
  }
  return ctx;
}

