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
  const day = now.getDay();
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
    }, 60000);

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
      toast.success("Horários atualizados!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar horários");
    } finally {
      setSavingHorario(false);
    }
  }, [horarioSemana, horarioDomingo, toast]);

  return (
    <div className="space-y-5">
      {/* Status aberto/fechado */}
      <div className={`rounded-2xl p-5 shadow-sm border ${
        aberto
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200"
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
            aberto ? "bg-green-100" : "bg-red-100"
          }`}>
            {aberto ? "🟢" : "🔴"}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {aberto ? "Aberto agora" : "Fechado agora"}
            </h3>
            <p className="text-xs text-gray-500">
              {new Date().toLocaleString("pt-BR")}
            </p>
          </div>
        </div>
      </div>

      {/* Card de horários */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header do card */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-sm">Horários de funcionamento</h3>
          {!editingHorario ? (
            <button
              onClick={() => setEditingHorario(true)}
              className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors"
            >
              Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <RippleButton
                onClick={handleSaveHorarios}
                disabled={savingHorario}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {savingHorario ? "Salvando..." : "Salvar"}
              </RippleButton>
              <button
                onClick={() => setEditingHorario(false)}
                className="text-gray-500 text-xs font-medium hover:text-gray-700 transition-colors px-3"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-5">
          {editingHorario ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Segunda a Sábado
                </label>
                <input
                  type="text"
                  value={horarioSemana}
                  onChange={(e) => setHorarioSemana(e.target.value)}
                  placeholder="Ex: Seg a Sab: 5h30 - 20h30"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Domingo / Feriados
                </label>
                <input
                  type="text"
                  value={horarioDomingo}
                  onChange={(e) => setHorarioDomingo(e.target.value)}
                  placeholder="Ex: Domingo: 5h30 - 13h30"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-gray-900 text-sm"
                />
              </div>
              <p className="text-xs text-gray-400">
                Formato: &quot;Texto: XhYZ - XhYZ&quot; — ex: &quot;Seg a Sab: 5h30 - 20h30&quot;
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-400 mb-1">📅 Semana</p>
                <p className="text-sm font-bold text-gray-900">{horarioSemana}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-400 mb-1">🎉 Domingo</p>
                <p className="text-sm font-bold text-gray-900">{horarioDomingo}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nota informativa */}
      <p className="text-xs text-gray-400 text-center px-4">
        Os horários aparecem no rodapé do cardápio e determinam o status aberto/fechado automaticamente.
      </p>
    </div>
  );
}
