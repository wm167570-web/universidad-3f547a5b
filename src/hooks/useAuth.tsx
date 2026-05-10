import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const SUPER_ADMINS = ["wmartinezm360@gmail.com"];

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

  // Perfil con React Query para caching y velocidad
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const isOwner = SUPER_ADMINS.includes(user.email ?? "");

      const [pRes, rRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
      ]);

      const profileData: any = pRes.data || { user_id: user.id, is_approved: false };
      if (isOwner) {
        profileData.is_approved = true;
      }

      return {
        profile: profileData,
        role: isOwner ? "admin" : (rRes.data?.role ?? "estudiante"),
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setAuthLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
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
    <AuthContext.Provider
      value={{
        user,
        session,
        profile: profileData?.profile || null,
        role: profileData?.role || null,
        loading,
        signOut,
      }}
    >
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
      signOut: async () => {},
    } satisfies AuthContextValue;
  }
  return ctx;
}
