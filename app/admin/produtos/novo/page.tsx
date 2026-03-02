"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import { useCardapio } from "@/contexts/CardapioContext";
import { useToast } from "@/components/Toast";
import { MenuItem } from "@/lib/validation";
import { uploadImage } from "@/lib/upload";

interface Adicional {
  id: string;
  name: string;
  price: number;
}

export default function NovoProdutoPage() {
  const router = useRouter();
  const cardapio = useCardapio();
  const toast = useToast();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(cardapio.categories[0]?.id || "");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Adicionais
  const [allAdicionais, setAllAdicionais] = useState<Adicional[]>([]);
  const [selectedAdicionais, setSelectedAdicionais] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/adicionais")
      .then(r => r.json())
      .then(d => setAllAdicionais(d.adicionais || []))
      .catch(() => {/* silencioso */});
  }, []);

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadImage(file, "products");
      setImage(result.url);
      toast.success(`Imagem carregada (${result.sizeKB}KB)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar imagem");
    } finally {
      setUploading(false);
    }
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) { toast.error("Digite o nome do produto"); return; }
    if (!category) { toast.error("Selecione uma categoria"); return; }

    const duplicate = cardapio.products.find(
      (p) => p.category === category && p.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (duplicate) { toast.error("Produto com este nome já existe nesta categoria"); return; }

    setSaving(true);
    try {
      const productId = uuid();
      const product: MenuItem = {
        id: productId,
        name: name.trim(),
        description: description.trim(),
        price: price ? parseFloat(price) : 0,
        category,
        available,
        image,
      };
      await cardapio.addProduct(product);

      // Vincular adicionais selecionados
      if (selectedAdicionais.length > 0) {
        await fetch("/api/adicionais", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "set-product", product_id: productId, adicional_ids: selectedAdicionais }),
        });
      }

      toast.success("Produto criado com sucesso!");
      router.push("/admin/produtos");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const toggleAdicional = (id: string) => {
    setSelectedAdicionais(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const inputClass = "w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-[#7c4e42] bg-white text-gray-900 text-base font-medium transition-colors";
  const labelClass = "block text-sm font-bold text-gray-500 mb-2 uppercase tracking-widest";

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5 pb-10">

      {/* ── FOTO ── */}
      <div>
        <label className={labelClass}>Foto do Produto</label>
        <label className="cursor-pointer block w-full">
          <div className={`w-full rounded-3xl border-2 border-dashed overflow-hidden transition-all ${
            image ? "border-[#7c4e42]" : "border-gray-300 hover:border-[#7c4e42]"
          }`}>
            {image ? (
              <div className="relative">
                <img src={image} alt="Preview" className="w-full h-56 object-cover" />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setImage(""); }}
                  className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center text-lg hover:bg-black/80 transition-all shadow-lg"
                >
                  ✕
                </button>
                <div className="absolute bottom-3 left-3 bg-black/50 text-white text-xs px-3 py-1 rounded-full font-medium">
                  Toque para trocar
                </div>
              </div>
            ) : uploading ? (
              <div className="py-16 text-center bg-amber-50">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#7c4e42] border-t-transparent mx-auto mb-4"></div>
                <p className="text-base font-semibold text-gray-600">Enviando imagem...</p>
                <p className="text-sm text-gray-400 mt-1">Aguarde um momento</p>
              </div>
            ) : (
              <div className="py-14 text-center bg-gray-50 hover:bg-amber-50/40 transition-colors">
                <span className="text-6xl block mb-3">📸</span>
                <p className="text-base font-semibold text-gray-700">Toque para adicionar foto</p>
                <p className="text-sm text-gray-400 mt-1">Opcional · até 10MB · compressão automática</p>
              </div>
            )}
          </div>
          <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={uploading} />
        </label>
      </div>

      {/* ── NOME ── */}
      <div>
        <label className={labelClass}>Nome do Produto *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Pão Francês"
          className={inputClass}
          required
        />
      </div>

      {/* ── PREÇO ── */}
      <div>
        <label className={labelClass}>Preço (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Ex: 5.90"
          className={inputClass}
        />
      </div>

      {/* ── CATEGORIA ── */}
      <div>
        <label className={labelClass}>Categoria *</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClass}
        >
          {cardapio.categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* ── DESCRIÇÃO ── */}
      <div>
        <label className={labelClass}>Descrição <span className="normal-case text-gray-400 font-normal tracking-normal">(opcional)</span></label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descreva o produto..."
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* ── ADICIONAIS ── */}
      {allAdicionais.length > 0 && (
        <div>
          <label className={labelClass}>
            Adicionais disponíveis{" "}
            <span className="normal-case text-gray-400 font-normal tracking-normal">(opcional)</span>
          </label>
          <div className="space-y-2">
            {allAdicionais.map((ad) => {
              const selected = selectedAdicionais.includes(ad.id);
              return (
                <button
                  key={ad.id}
                  type="button"
                  onClick={() => toggleAdicional(ad.id)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border-2 transition-all text-left ${
                    selected
                      ? "bg-green-50 border-green-400"
                      : "bg-gray-50 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 transition-all ${
                      selected ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"
                    }`}>
                      {selected ? "✓" : "+"}
                    </span>
                    <span className="font-semibold text-gray-800 text-base">{ad.name}</span>
                  </div>
                  <span className="text-sm font-bold text-[#7c4e42]">+ R$ {ad.price.toFixed(2)}</span>
                </button>
              );
            })}
          </div>
          {selectedAdicionais.length > 0 && (
            <p className="text-xs text-green-600 font-semibold mt-2 ml-1">
              ✓ {selectedAdicionais.length} {selectedAdicionais.length === 1 ? "adicional selecionado" : "adicionais selecionados"}
            </p>
          )}
        </div>
      )}

      {/* ── DISPONIBILIDADE ── */}
      <button
        type="button"
        onClick={() => setAvailable(!available)}
        className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all ${
          available
            ? "bg-green-50 border-green-400"
            : "bg-gray-100 border-gray-300"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{available ? "✅" : "⏸️"}</span>
          <div className="text-left">
            <p className="text-base font-bold text-gray-800">Disponível no cardápio</p>
            <p className="text-sm text-gray-500">{available ? "Aparece para os clientes" : "Oculto para os clientes"}</p>
          </div>
        </div>
        <div className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 ${available ? "bg-green-500" : "bg-gray-300"}`}>
          <span
            className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all"
            style={{ left: available ? "30px" : "4px" }}
          />
        </div>
      </button>

      {/* ── BOTÕES ── */}
      <div className="flex flex-col gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || uploading}
          className="w-full bg-[#7c4e42] text-white py-5 rounded-2xl font-bold text-lg hover:bg-[#5a3a2f] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-[#7c4e42]/30"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-3">
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
              Salvando produto...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>✓</span> Criar Produto
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/produtos")}
          className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-semibold text-base hover:bg-gray-200 active:scale-[0.98] transition-all"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
