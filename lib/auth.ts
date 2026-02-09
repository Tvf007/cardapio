import { supabase } from "./supabase";

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

const ADMIN_PASSWORD_HASH = process.env.NEXT_PUBLIC_ADMIN_PASSWORD_HASH;

// SHA-256 usando Web Crypto API (funciona no browser, sem Node.js crypto)
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const passwordHash = await sha256(password);
    return passwordHash === hash;
  } catch (error) {
    console.error("Erro ao verificar senha:", error);
    return false;
  }
}

export async function loginWithPassword(password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    if (!ADMIN_PASSWORD_HASH) {
      return {
        user: null,
        error: "Autenticacao nao configurada. Defina NEXT_PUBLIC_ADMIN_PASSWORD_HASH",
      };
    }

    const isValid = await verifyPassword(password, ADMIN_PASSWORD_HASH);
    if (isValid) {
      const user: AuthUser = {
        id: "admin-001",
        email: "admin@cardapio.local",
        isAdmin: true,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("admin-user", JSON.stringify(user));
      }
      return { user, error: null };
    }

    return { user: null, error: "Senha incorreta" };
  } catch (error) {
    return { user: null, error: error instanceof Error ? error.message : "Erro ao fazer login" };
  }
}

export async function logout(): Promise<{ error: string | null }> {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin-user");
    }
    const { error } = await supabase.auth.signOut();
    return { error: error?.message || null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erro ao fazer logout" };
  }
}

function isValidAuthUser(obj: unknown): obj is AuthUser {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "email" in obj &&
    "isAdmin" in obj &&
    typeof (obj as Record<string, unknown>).id === "string" &&
    typeof (obj as Record<string, unknown>).email === "string" &&
    typeof (obj as Record<string, unknown>).isAdmin === "boolean"
  );
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    if (typeof window === "undefined") return null;

    const savedUser = localStorage.getItem("admin-user");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (isValidAuthUser(parsedUser)) {
          return parsedUser;
        }
        localStorage.removeItem("admin-user");
      } catch {
        localStorage.removeItem("admin-user");
      }
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email || "",
      isAdmin: true,
    };
  } catch {
    return null;
  }
}

export async function signUpAdmin(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: "Erro ao criar usuario" };
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email || "",
        isAdmin: true,
      },
      error: null,
    };
  } catch (error) {
    return { user: null, error: error instanceof Error ? error.message : "Erro ao registrar" };
  }
}
