"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";

function parseHorario(horarioStr: string): { open: number; close: number } | null {
  const match = horarioStr.match(/(\d{1,2})h(\d{2})?\s*-\s*(\d{1,2})h(\d{2})?/);
  if (!match) return null;
  return {
    open: parseInt(match[1], 10) * 60 + parseInt(match[2] || "0", 10),
    close: parseInt(match[3], 10) * 60 + parseInt(match[4] || "0", 10),
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aberto, setAberto] = useState(false);
  const toast = useToast();

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

  useEffect(() => {
    setAberto(isOpen(horarioSemana, horarioDomingo));
    const interval = setInterval(() => {
      setAberto(isOpen(horarioSemana, horarioDomingo));
    }, 60000);
    return () => clearInterval(interval);
  }, [horarioSemana, horarioDomingo]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "horarios", value: { semana: horarioSemana, domingo: horarioDomingo } }),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao salvar");
      }
      setEditing(false);
      toast.success("Horários atualizados!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }, [horarioSemana, horarioDomingo, toast]);

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Status */}
      <div className={`rounded-2xl p-5 text-center ${aberto ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${aberto ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${aberto ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          {aberto ? "Aberto agora" : "Fechado agora"}
        </div>
      </div>

      {/* Card de horários */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-50">
          <span className="font-bold text-gray-900 text-sm">Funcionamento</span>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="text-[#7c4e42] text-sm font-semibold hover:underline">
              Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#7c4e42] text-white px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-[#5a3a2f] transition-all disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
              <button onClick={() => setEditing(false)} className="text-gray-500 text-xs font-medium px-2">
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="p-4">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Segunda a Sábado</label>
                <input
                  type="text"
                  value={horarioSemana}
                  onChange={(e) => setHorarioSemana(e.target.value)}
                  placeholder="Ex: Seg a Sab: 5h30 - 20h30"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c4e42] focus:border-transparent bg-white text-gray-900 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Domingo / Feriados</label>
                <input
                  type="text"
                  value={horarioDomingo}
                  onChange={(e) => setHorarioDomingo(e.target.value)}
                  placeholder="Ex: Domingo: 5h30 - 13h30"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c4e42] focus:border-transparent bg-white text-gray-900 text-sm"
                />
              </div>
              <p className="text-xs text-gray-400 text-center">
                Formato: &quot;Texto: XhYZ - XhYZ&quot;
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-[#fdf6ee] rounded-xl p-4 text-center">
                <p className="text-xs font-semibold text-[#7c4e42] mb-1 uppercase tracking-wider">📅 Semana</p>
                <p className="text-sm font-bold text-gray-900">{horarioSemana}</p>
              </div>
              <div className="bg-[#fdf6ee] rounded-xl p-4 text-center">
                <p className="text-xs font-semibold text-[#7c4e42] mb-1 uppercase tracking-wider">🎉 Domingo</p>
                <p className="text-sm font-bold text-gray-900">{horarioDomingo}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Aparece no rodapé do cardápio • Status automático
      </p>
    </div>
  );
}
