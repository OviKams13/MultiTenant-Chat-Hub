import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { apiClient } from "@/lib/api";

type AppRole = "admin" | "user";

interface AuthUser {
  id: number;
  email: string;
  role: "ADMIN" | "USER";
  createdAt: string;
}

interface AuthPayload {
  user: AuthUser;
  token: string;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  role: AppRole | null;
  fullName: string;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<AppRole>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const TOKEN_KEY = "chathub_admin_token";

const mapRole = (role?: string): AppRole => (role === "ADMIN" ? "admin" : "user");

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const profile = await apiClient.get<AuthUser>("/auth/me", storedToken);
        setToken(storedToken);
        setUser(profile);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const persistSession = (payload: AuthPayload) => {
    setToken(payload.token);
    setUser(payload.user);
    localStorage.setItem(TOKEN_KEY, payload.token);
  };

  const signUp = async (email: string, password: string) => {
    const authResult = await apiClient.post<AuthPayload>("/auth/register", { email, password });
    persistSession(authResult);
  };

  const signIn = async (email: string, password: string): Promise<AppRole> => {
    const authResult = await apiClient.post<AuthPayload>("/auth/login", { email, password });
    persistSession(authResult);
    return mapRole(authResult.user.role);
  };

  const signOut = async () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      role: user ? mapRole(user.role) : null,
      fullName: user?.email ?? "",
      loading,
      signUp,
      signIn,
      signOut,
    }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
