import { supabase } from "./supabase";

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

// Fazer login com email e senha
export async function loginWithEmail(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: "Usuário não encontrado" };
    }

    // Verificar se é admin (pode ser feito verificando um perfil no Supabase ou um claim customizado)
    // Por enquanto, considerar qualquer usuário logado como admin da sua conta
    return {
      user: {
        id: data.user.id,
        email: data.user.email || "",
        isAdmin: true, // Você pode adicionar lógica aqui para verificar perfil
      },
      error: null,
    };
  } catch (error) {
    return { user: null, error: error instanceof Error ? error.message : "Erro ao fazer login" };
  }
}

// Fazer logout
export async function logout(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message || null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Erro ao fazer logout" };
  }
}

// Obter usuário atualmente logado
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
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
