import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useQuery } from "@tanstack/react-query";
import { UserProfile } from "@/types";

const SUPER_ADMINS = ["wmartinezm360@gmail.com"];

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  role: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};


const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Perfil con React Query para caching y velocidad
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", user?.uid],
    queryFn: async () => {
      if (!user) return null;

      const isOwner = SUPER_ADMINS.includes(user.email ?? "");

      // Intentar obtener perfil de Firestore
      const profileDoc = await getDoc(doc(db, "profiles", user.uid));
      const roleDoc = await getDoc(doc(db, "user_roles", user.uid));

      const profileData = (profileDoc.exists() ? profileDoc.data() : { user_id: user.uid, is_approved: false }) as UserProfile;
      
      if (isOwner) {
        profileData.is_approved = true;
      }

      return {
        profile: profileData,
        role: isOwner ? "admin" : (roleDoc.exists() ? roleDoc.data()?.role : "estudiante"),
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
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
