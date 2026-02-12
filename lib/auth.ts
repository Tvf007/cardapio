/**
 * Auth Client - Funções de autenticação do lado do cliente
 *
 * SECURITY: Toda verificação de senha acontece no servidor.
 * O cliente apenas envia a senha via HTTPS e recebe um cookie HTTP-only com JWT.
 * Nenhum hash ou token é exposto ao JavaScript do browser.
 */

export interface AuthUser {
  id: string;
  email: string;
  isAdmin: boolean;
}

/**
 * Login com senha - envia para o servidor que verifica e retorna cookie JWT
 */
export async function loginWithPassword(
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      credentials: "include", // CRITICAL: Enviar/receber cookies HTTP-only
    });

    const data = await response.json();

    if (!response.ok) {
      // Rate limiting
      if (response.status === 429) {
        return {
          user: null,
          error: data.error || "Muitas tentativas. Aguarde um momento.",
        };
      }
      return {
        user: null,
        error: data.error || "Senha incorreta",
      };
    }

    if (data.user) {
      return { user: data.user as AuthUser, error: null };
    }

    return { user: null, error: "Resposta inesperada do servidor" };
  } catch (error) {
    console.error("[Auth] Erro no login:", error);
    return {
      user: null,
      error: error instanceof Error ? error.message : "Erro de conexão",
    };
  }
}

/**
 * Logout - limpa o cookie JWT no servidor
 */
export async function logout(): Promise<{ error: string | null }> {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include", // CRITICAL: Enviar cookie para o servidor limpar
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { error: data.error || "Erro ao fazer logout" };
    }

    // Limpar dados locais de sessão (se houver)
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin-user");
    }

    return { error: null };
  } catch (error) {
    console.error("[Auth] Erro no logout:", error);
    return {
      error: error instanceof Error ? error.message : "Erro de conexão",
    };
  }
}

/**
 * Verifica se o usuário está logado via cookie JWT
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include", // CRITICAL: Enviar cookie JWT
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.user && data.user.isAdmin) {
      return data.user as AuthUser;
    }

    return null;
  } catch {
    // Silenciosamente retorna null em caso de erro de rede
    return null;
  }
}
