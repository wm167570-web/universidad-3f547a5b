import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { UserProfile } from "@/types";
import { User } from "@supabase/supabase-js";

const SUPER_ADMINS = ["wmartinezm360@gmail.com"];

// Ampliamos el User de Supabase para mantener retrocompatibilidad temporal con el DAL (uid)
export type AppUser = User & { uid: string };

type AuthContextValue = {
  user: AppUser | null;
  profile: UserProfile | null;
  role: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Perfil con React Query para caching y velocidad
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const isOwner = SUPER_ADMINS.includes(user.email ?? "");

      // Intentar obtener perfil de Supabase
      const { data: profileDoc } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      const { data: roleDoc } = await supabase.from('user_roles').select('*').eq('user_id', user.id).maybeSingle();

      const profileData = (profileDoc ? profileDoc : { user_id: user.id, is_approved: false }) as UserProfile;
      
      if (isOwner) {
        profileData.is_approved = true;
      }

      return {
        profile: profileData,
        role: isOwner ? "admin" : (roleDoc ? roleDoc.role : "estudiante"),
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const mapSupabaseUser = (u: User | null): AppUser | null => {
    if (!u) return null;
    return { ...u, uid: u.id } as AppUser; // Mapping uid to id for DAL compat
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(mapSupabaseUser(session?.user ?? null));
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapSupabaseUser(session?.user ?? null));
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
      profile: null,
      role: null,
      loading: true,
      signOut: async () => {},
    } satisfies AuthContextValue;
  }
  return ctx;
}
