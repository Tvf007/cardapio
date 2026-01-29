import { supabase } from "./supabase";
import crypto from "crypto";

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

// Hash da senha armazenado seguramente no .env (nunca a senha em texto plano!)
const ADMIN_PASSWORD_HASH = process.env.NEXT_PUBLIC_ADMIN_PASSWORD_HASH;

if (!ADMIN_PASSWORD_HASH) {
  console.warn("⚠️ NEXT_PUBLIC_ADMIN_PASSWORD_HASH não configurada. Auth desabilitada.");
}

// Função para comparar senha com hash SHA256
function verifyPassword(password: string, hash: string): boolean {
  try {
    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
    return passwordHash === hash;
  } catch (error) {
    console.error("Erro ao verificar senha:", error);
    return false;
  }
}

// Fazer login com apenas senha
export async function loginWithPassword(password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    if (!ADMIN_PASSWORD_HASH) {
      return {
        user: null,
        error: "Autenticação não configurada. Defina NEXT_PUBLIC_ADMIN_PASSWORD_HASH",
      };
    }

    // Verificar senha de forma segura (comparando hashes, não strings)
    if (verifyPassword(password, ADMIN_PASSWORD_HASH)) {
      const user: AuthUser = {
        id: "admin-001",
        email: "admin@cardapio.local",
        isAdmin: true,
      };
      // Salvar no localStorage para manter sessão
      if (typeof window !== "undefined") {
        localStorage.setItem("admin-user", JSON.stringify(user));
      }
      console.log("✅ Login bem-sucedido");
      return {
        user,
        error: null,
      };
    }

    return { user: null, error: "Senha incorreta" };
  } catch (error) {
    return { user: null, error: error instanceof Error ? error.message : "Erro ao fazer login" };
  }
}

// Fazer login com email e senha (mantido para compatibilidade)
export async function loginWithEmail(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  return loginWithPassword(password);
}

// Fazer logout
export async function logout(): Promise<{ error: string | null }> {
  try {
    // Limpar session do localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin-user");
    }

    // Tentar fazer logout no Supabase também
    const { error } = await supabase.auth.signOut();
    return { error: error?.message || null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erro ao fazer logout" };
  }
}

// Validar se o objeto é um AuthUser válido
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

// Obter usuário atualmente logado
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    // Verificar se existe usuário no localStorage (session simples)
    const savedUser = localStorage.getItem("admin-user");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (isValidAuthUser(parsedUser)) {
          return parsedUser;
        }
        // Se inválido, remover do localStorage
        localStorage.removeItem("admin-user");
      } catch {
        localStorage.removeItem("admin-user");
      }
    }

    // Tentar obter do Supabase
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email || "",
      isAdmin: true,
    };
  } catch (error) {
    console.error("Erro ao obter usuário:", error);
    return null;
  }
}

// Registrar novo admin (apenas para criação de contas iniciais)
export async function signUpAdmin(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: "Erro ao criar usuário" };
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
