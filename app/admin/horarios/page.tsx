"use client";

import { useState, useEffect, useCallback } from "react";
import { RippleButton } from "@/components/RippleButton";
import { useToast } from "@/components/Toast";

interface Horarios {
  semana: string;
  domingo: string;
}

function parseHorario(horarioStr: string): { open: number; close: number } | null {
  const match = horarioStr.match(/(\d{1,2})h(\d{2})?\s*-\s*(\d{1,2})h(\d{2})?/);
  if (!match) return null;

  const openHour = parseInt(match[1], 10);
  const openMin = parseInt(match[2] || "0", 10);
  const closeHour = parseInt(match[3], 10);
  const closeMin = parseInt(match[4] || "0", 10);

  return {
    open: openHour * 60 + openMin,
    close: closeHour * 60 + closeMin,
  };
}

function isOpen(horarioSemana: string, horarioDomingo: string): boolean {
  const now = new Date();
  const day = now.getDay(); // 0 = domingo
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const horario = day === 0 ? horarioDomingo : horarioSemana;
  const parsed = parseHorario(horario);

  if (!parsed) return false;
  return currentMinutes >= parsed.open && currentMinutes <= parsed.close;
}

export default function HorariosPage() {
  const [horarioSemana, setHorarioSemana] = useState("Seg a Sab: 5h30 - 20h30");
  const [horarioDomingo, setHorarioDomingo] = useState("Domingo: 5h30 - 13h30");
  const [editingHorario, setEditingHorario] = useState(false);
  const [savingHorario, setSavingHorario] = useState(false);
  const [aberto, setAberto] = useState(false);
  const toast = useToast();

  // Carregar horários do servidor
  useEffect(() => {
    const loadHorarios = async () => {
      try {
        const res = await fetch("/api/site-config?key=horarios", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.value) {
            setHorarioSemana(data.value.semana || "Seg a Sab: 5h30 - 20h30");
            setHorarioDomingo(data.value.domingo || "Domingo: 5h30 - 13h30");
          }
        }
      } catch (error) {
        console.error("Erro ao carregar horários:", error);
      }
    };
    loadHorarios();
  }, []);

  // Atualizar status de aberto/fechado a cada minuto
  useEffect(() => {
    setAberto(isOpen(horarioSemana, horarioDomingo));
    const interval = setInterval(() => {
      setAberto(isOpen(horarioSemana, horarioDomingo));
    }, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, [horarioSemana, horarioDomingo]);

  const handleSaveHorarios = useCallback(async () => {
    setSavingHorario(true);
    try {
      const res = await fetch("/api/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "horarios",
          value: { semana: horarioSemana, domingo: horarioDomingo },
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao salvar");
      }
      setEditingHorario(false);
      toast.success("Horários atualizados com sucesso!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar horários");
    } finally {
      setSavingHorario(false);
    }
  }, [horarioSemana, horarioDomingo, toast]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Horários de Funcionamento</h2>
        <p className="text-gray-600">Configure os horários em que você funciona</p>
      </div>

      {/* Status Card */}
      <div className={`rounded-2xl border-2 p-6 shadow-sm ${
        aberto
          ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300"
          : "bg-gradient-to-r from-red-50 to-rose-50 border-red-300"
      }`}>
        <div className="flex items-center gap-4">
          <div className={`text-5xl ${aberto ? "animate-pulse" : ""}`}>
            {aberto ? "🟢" : "🔴"}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {aberto ? "Aberto Agora" : "Fechado Agora"}
            </h3>
            <p className={`text-sm font-semibold ${aberto ? "text-green-600" : "text-red-600"}`}>
              {new Date().toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      </div>

      {/* Horarios Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">🕐 Horários</h3>
          {!editingHorario ? (
            <RippleButton
              onClick={() => setEditingHorario(true)}
              className="bg-blue-100 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 transition-all"
            >
              ✏️ Editar
            </RippleButton>
          ) : (
            <div className="flex gap-2">
              <RippleButton
                onClick={handleSaveHorarios}
                disabled={savingHorario}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-all disabled:opacity-50"
              >
                {savingHorario ? "Salvando..." : "✓ Salvar"}
              </RippleButton>
              <RippleButton
                onClick={() => setEditingHorario(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-all"
              >
                ✕ Cancelar
              </RippleButton>
            </div>
          )}
        </div>

        {editingHorario ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dias de semana (Segunda a Sábado)
              </label>
              <input
                type="text"
                value={horarioSemana}
                onChange={(e) => setHorarioSemana(e.target.value)}
                placeholder="Ex: Seg a Sab: 5h30 - 20h30"
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formato: "Texto: XhYZ - XhYZ" (ex: "Seg a Sab: 5h30 - 20h30")
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Domingo / Feriados
              </label>
              <input
                type="text"
                value={horarioDomingo}
                onChange={(e) => setHorarioDomingo(e.target.value)}
                placeholder="Ex: Domingo: 5h30 - 13h30"
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formato: "Texto: XhYZ - XhYZ" (ex: "Domingo: 5h30 - 13h30")
              </p>
            </div>
            <p className="text-xs text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
              💡 Essas informações aparecem no rodapé do cardápio público e determinam o status "aberto/fechado".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">📅 Dias de semana</p>
              <p className="text-lg font-semibold text-gray-900">{horarioSemana}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">🎉 Domingo / Feriados</p>
              <p className="text-lg font-semibold text-gray-900">{horarioDomingo}</p>
            </div>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h4 className="font-bold text-gray-900 mb-3">ℹ️ Informações</h4>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✓ Os horários aparecem no rodapé do seu cardápio público</li>
          <li>✓ O status "aberto/fechado" é atualizado automaticamente baseado na hora atual</li>
          <li>✓ Use o formato: "Seg a Sab: 5h30 - 20h30"</li>
          <li>✓ O minuto é opcional (ex: "5h - 20h" também funciona)</li>
        </ul>
      </div>
    </div>
  );
}
