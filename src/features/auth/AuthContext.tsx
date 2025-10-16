import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthError, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

type AuthMode = "login" | "register";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  isConfigured: boolean;
};

type AuthActionResult = {
  error?: string;
  mode?: AuthMode;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const mapAuthError = (error: AuthError): string => {
  switch (error.code) {
    case "email_exists":
    case "user_already_exists":
      return "Email sudah terdaftar. Silakan masuk atau gunakan email lain.";
    case "invalid_credentials":
      return "Email atau kata sandi salah. Periksa kembali dan coba lagi.";
    case "weak_password":
      return "Kata sandi terlalu lemah. Gunakan minimal 6 karakter yang kuat.";
    case "over_email_send_rate_limit":
      return "Terlalu banyak percobaan. Coba lagi beberapa menit kemudian.";
    default:
      return error.message || "Terjadi kesalahan tak terduga.";
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    };

    init().catch((error) => {
      console.error("Gagal memuat sesi Supabase:", error);
      if (mounted) {
        setUser(null);
        setLoading(false);
      }
    });

    if (!isSupabaseConfigured) {
      return () => {
        mounted = false;
      };
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (!isSupabaseConfigured) {
        return {
          error:
            "Supabase belum dikonfigurasi. Set VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.",
        };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: mapAuthError(error) };
      }

      return {};
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName?: string
    ): Promise<AuthActionResult> => {
      if (!isSupabaseConfigured) {
        return {
          error:
            "Supabase belum dikonfigurasi. Set VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.",
        };
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: fullName
          ? {
              data: {
                fullName,
              },
            }
          : undefined,
      });

      if (error) {
        return { error: mapAuthError(error), mode: "register" };
      }

      return {};
    },
    []
  );

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Gagal keluar dari Supabase:", error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        isConfigured: isSupabaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth harus digunakan di dalam AuthProvider");
  }
  return context;
};
