"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/Toast";

interface Adicional {
  id: string;
  name: string;
  price: number;
}

export default function AdicionaisAdminPage() {
  const toast = useToast();

  const [adicionais, setAdicionais] = useState<Adicional[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form: novo adicional
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");

  // Edição inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const fetchAdicionais = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/adicionais");
      const data = await res.json();
      setAdicionais(data.adicionais || []);
    } catch {
      toast.error("Erro ao carregar adicionais");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAdicionais();
  }, [fetchAdicionais]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { toast.error("Digite o nome do adicional"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/adicionais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "create", name: newName.trim(), price: parseFloat(newPrice) || 0 }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao criar adicional");
        return;
      }
      toast.success("Adicional criado!");
      setNewName("");
      setNewPrice("");
      await fetchAdicionais();
    } catch {
      toast.error("Erro ao criar adicional");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (ad: Adicional) => {
    setEditingId(ad.id);
    setEditName(ad.name);
    setEditPrice(ad.price.toFixed(2));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditPrice("");
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/adicionais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "update", id, name: editName.trim(), price: parseFloat(editPrice) || 0 }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao atualizar");
        return;
      }
      toast.success("Adicional atualizado!");
      cancelEdit();
      await fetchAdicionais();
    } catch {
      toast.error("Erro ao atualizar adicional");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remover "${name}"? Ele será desvinculado de todos os produtos.`)) return;
    try {
      const res = await fetch("/api/adicionais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "delete", id }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao remover");
        return;
      }
      toast.success(`"${name}" removido!`);
      await fetchAdicionais();
    } catch {
      toast.error("Erro ao remover adicional");
    }
  };

  const inputClass = "w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-[#7c4e42] bg-white text-gray-900 text-base font-medium transition-colors";

  return (
    <div className="w-full space-y-6 pb-10">

      {/* ── FORMULÁRIO NOVO ADICIONAL ── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-bold text-gray-700 uppercase tracking-widest mb-4">
          ➕ Novo Adicional
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Nome do Adicional *
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Queijo Extra, Bacon, Ovo..."
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Preço (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Ex: 3.50"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#7c4e42] text-white py-4 rounded-2xl font-bold text-base hover:bg-[#5a3a2f] active:scale-[0.98] transition-all disabled:opacity-50 shadow-md shadow-[#7c4e42]/25"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Salvando...
              </span>
            ) : (
              "✓ Adicionar"
            )}
          </button>
        </form>
      </div>

      {/* ── LISTA DE ADICIONAIS ── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-700 uppercase tracking-widest">
            📋 Adicionais Cadastrados
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {adicionais.length} {adicionais.length === 1 ? "adicional" : "adicionais"} disponíveis
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7c4e42]" />
          </div>
        ) : adicionais.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <span className="text-5xl block mb-3">🍔</span>
            <p className="font-medium">Nenhum adicional cadastrado ainda.</p>
            <p className="text-sm mt-1">Use o formulário acima para começar.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {adicionais.map((ad) => (
              <li key={ad.id} className="px-5 py-4">
                {editingId === ad.id ? (
                  /* Modo edição inline */
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={`${inputClass} text-sm py-3`}
                      autoFocus
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      placeholder="Ex: 3.50"
                      className={`${inputClass} text-sm py-3`}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(ad.id)}
                        disabled={saving}
                        className="flex-1 bg-[#7c4e42] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-[#5a3a2f] transition-all disabled:opacity-50"
                      >
                        {saving ? "Salvando..." : "✓ Salvar"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Visualização normal */
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-base truncate">{ad.name}</p>
                      <p className="text-sm text-[#7c4e42] font-semibold mt-0.5">
                        + R$ {ad.price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => startEdit(ad)}
                        className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100 transition-all text-sm"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(ad.id, ad.name)}
                        className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-all text-sm"
                        title="Remover"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
