"use client";

import { useState } from "react";

interface AdminLoginProps {
  onLogin: (email: string, password: string) => Promise<void>;
  isLoading?: boolean;
}

export function AdminLogin({ onLogin, isLoading: parentLoading = false }: AdminLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (!email) {
        setError("Digite seu email");
        setIsLoading(false);
        return;
      }
      if (!password) {
        setError("Digite sua senha");
        setIsLoading(false);
        return;
      }

      await onLogin(email, password);
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ backgroundColor: '#7c4e42' }}></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-8 py-12 text-center" style={{ background: 'linear-gradient(to right, #7c4e42, #a67c5a)' }}>
            <div className="inline-block w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
              <span className="text-4xl">🔐</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Painel Admin</h1>
            <p className="text-white opacity-90">Acesso Restrito</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Email de Acesso
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none transition-all duration-200 bg-white text-gray-900 placeholder-gray-400"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#7c4e42';
                    e.target.style.boxShadow = '0 0 0 2px rgba(124, 78, 66, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <span className="absolute right-3 top-3 text-xl">✉️</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Senha
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Digite sua senha"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none transition-all duration-200 bg-white text-gray-900 placeholder-gray-400"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#7c4e42';
                    e.target.style.boxShadow = '0 0 0 2px rgba(124, 78, 66, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <span className="absolute right-3 top-3 text-xl">🔑</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <p className="text-red-700 text-sm font-medium">⚠️ {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full text-white py-3 rounded-lg font-bold transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(to right, #7c4e42, #a67c5a)',
                boxShadow: '0 4px 15px rgba(124, 78, 66, 0.3)'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = 'linear-gradient(to right, #5a3a2f, #8b6a4a)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(124, 78, 66, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to right, #7c4e42, #a67c5a)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(124, 78, 66, 0.3)';
              }}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Entrando...
                </>
              ) : (
                <>
                  <span>→</span>
                  Entrar
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-600">
              Apenas administradores têm acesso
            </p>
          </form>
        </div>

        {/* Footer Text */}
        <p className="text-center text-gray-400 text-sm mt-8">
          Caixa Freitas © 2024
        </p>
      </div>
    </div>
  );
}
