import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export type User = SupabaseUser & {
  uid: string;
  displayName: string | null;
  getIdToken: () => Promise<string>;
};

const normalizeUser = (user: SupabaseUser | null): User | null => {
  if (!user) return null;
  const metadata = user.user_metadata ?? {};
  return Object.assign(user, {
    uid: user.id,
    displayName: (metadata.full_name || metadata.name || user.email?.split("@")[0] || null) as string | null,
    getIdToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? "";
    },
  });
};

export function getAuth(_app?: unknown) {
  return {
    get currentUser() {
      const maybeUser = (supabase.auth as unknown as { user?: SupabaseUser | null }).user;
      return normalizeUser(maybeUser ?? null);
    },
  };
}

export class GoogleAuthProvider {}

export async function signInWithEmailAndPassword(_auth: unknown, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  (supabase.auth as unknown as { user?: SupabaseUser | null }).user = data.user;
  return { user: normalizeUser(data.user)! };
}

export async function createUserWithEmailAndPassword(_auth: unknown, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
  });
  if (error) throw error;
  (supabase.auth as unknown as { user?: SupabaseUser | null }).user = data.user;
  return { user: normalizeUser(data.user)! };
}

export async function signInWithPopup(_auth?: unknown, _provider?: unknown) {
  const { lovable } = await import("@/integrations/lovable");
  await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
  const { data } = await supabase.auth.getUser();
  return { user: normalizeUser(data.user)! };
}

export async function updateProfile(user: User, profile: { displayName?: string | null }) {
  const { error } = await supabase.auth.updateUser({
    data: { full_name: profile.displayName ?? user.displayName ?? user.email?.split("@")[0] },
  });
  if (error) throw error;
}

export function onAuthStateChanged(_auth: unknown, callback: (user: User | null) => void) {
  supabase.auth.getUser().then(({ data }) => {
    (supabase.auth as unknown as { user?: SupabaseUser | null }).user = data.user;
    callback(normalizeUser(data.user));
  });
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    (supabase.auth as unknown as { user?: SupabaseUser | null }).user = session?.user ?? null;
    callback(normalizeUser(session?.user ?? null));
  });
  return () => subscription.unsubscribe();
}

export async function signOut(_auth?: unknown) {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  (supabase.auth as unknown as { user?: SupabaseUser | null }).user = null;
}