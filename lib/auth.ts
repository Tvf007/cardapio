import { supabase } from "./supabase";

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

// Credenciais de teste para desenvolvimento
const DEMO_PASSWORD = "caixa 123";

// Fazer login com apenas senha
export async function loginWithPassword(password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    // Permitir login de teste apenas com senha
    if (password === DEMO_PASSWORD) {
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

// Obter usuário atualmente logado
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    // Verificar se existe usuário no localStorage (session simples)
    const savedUser = localStorage.getItem("admin-user");
    if (savedUser) {
      return JSON.parse(savedUser);
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
