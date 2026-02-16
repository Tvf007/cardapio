"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCardapio } from "@/contexts/CardapioContext";
import { useToast } from "@/components/Toast";
import { MenuItem } from "@/lib/validation";

function compressProductImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Selecione um arquivo de imagem válido"));
      return;
    }
    const maxFileSizeMB = 10;
    if (file.size / (1024 * 1024) > maxFileSizeMB) {
      reject(new Error(`Arquivo muito grande. Máximo ${maxFileSizeMB}MB.`));
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      const maxW = 1200, maxH = 1200;
      let { width, height } = img;
      if (width > height) { if (width > maxW) { height = Math.round((height * maxW) / width); width = maxW; } }
      else { if (height > maxH) { width = Math.round((width * maxH) / height); height = maxH; } }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      let result = canvas.toDataURL("image/jpeg", 0.85);
      let sizeKB = (result.length * 3) / 4 / 1024;
      if (sizeKB > 1500) {
        result = canvas.toDataURL("image/jpeg", 0.6);
        sizeKB = (result.length * 3) / 4 / 1024;
      }
      if (sizeKB > 1500) { reject(new Error("Imagem muito pesada após compressão.")); return; }
      resolve(result);
    };

    img.onerror = () => reject(new Error("Erro ao carregar imagem"));
    const reader = new FileReader();
    reader.onload = (ev) => { img.src = ev.target?.result as string; };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export default function EditarProdutoPage() {
  const router = useRouter();
  const params = useParams();
  const cardapio = useCardapio();
  const toast = useToast();

  const productId = params.id as string;
  const existingProduct = cardapio.products.find((p) => p.id === productId);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Carregar dados do produto
  useEffect(() => {
    if (existingProduct && !loaded) {
      setName(existingProduct.name);
      setPrice(existingProduct.price ? existingProduct.price.toString() : "");
      setCategory(existingProduct.category);
      setDescription(existingProduct.description || "");
      setImage(existingProduct.image || "");
      setAvailable(existingProduct.available !== false);
      setLoaded(true);
    }
  }, [existingProduct, loaded]);

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressProductImage(file);
      setImage(compressed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar imagem");
    }
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) { toast.error("Digite o nome do produto"); return; }
    if (!category) { toast.error("Selecione uma categoria"); return; }

    const duplicate = cardapio.products.find(
      (p) => p.category === category && p.name.toLowerCase() === name.trim().toLowerCase() && p.id !== productId
    );
    if (duplicate) { toast.error("Produto com este nome já existe nesta categoria"); return; }

    setSaving(true);
    try {
      const product: MenuItem = {
        id: productId,
        name: name.trim(),
        description: description.trim(),
        price: price ? parseFloat(price) : 0,
        category,
        available,
        image,
      };
      await cardapio.updateProduct(product);
      toast.success("Produto atualizado!");
      router.push("/admin/produtos");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (!existingProduct && cardapio.products.length > 0) {
    return (
      <div className="text-center py-16">
        <span className="text-5xl block mb-3">❓</span>
        <p className="text-gray-500 font-medium text-sm">Produto não encontrado</p>
        <button
          onClick={() => router.push("/admin/produtos")}
          className="mt-4 text-[#7c4e42] font-semibold text-sm hover:underline"
        >
          Voltar para produtos
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-5">
      {/* Foto */}
      <div className="flex flex-col items-center">
        <label className="cursor-pointer w-full">
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden hover:border-[#d4a574] transition-all">
            {image ? (
              <div className="relative">
                <img src={image} alt="Preview" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setImage(""); }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center text-sm hover:bg-black/70 transition-all"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="py-12 text-center">
                <span className="text-4xl block mb-2">📸</span>
                <p className="text-sm font-medium text-gray-500">Toque para adicionar foto</p>
                <p className="text-xs text-gray-400 mt-1">Opcional • até 10MB</p>
              </div>
            )}
          </div>
          <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </label>
      </div>

      {/* Nome */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Nome</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Pão Francês"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c4e42] focus:border-transparent bg-white text-gray-900 font-medium text-sm"
        />
      </div>

      {/* Preço */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Preço (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0,00"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c4e42] focus:border-transparent bg-white text-gray-900 font-medium text-sm"
        />
      </div>

      {/* Categoria */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Categoria</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c4e42] focus:border-transparent bg-white text-gray-900 font-medium text-sm"
        >
          {cardapio.categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Descrição</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opcional..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c4e42] focus:border-transparent bg-white text-gray-900 text-sm resize-none"
        />
      </div>

      {/* Disponibilidade */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
        <span className="text-sm font-medium text-gray-700">Disponível no cardápio</span>
        <button
          type="button"
          onClick={() => setAvailable(!available)}
          className={`w-12 h-7 rounded-full transition-all relative ${available ? "bg-green-500" : "bg-gray-300"}`}
        >
          <span className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all"
            style={{ left: available ? "22px" : "2px" }}
          />
        </button>
      </div>

      {/* Botões */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-[#7c4e42] text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-[#5a3a2f] transition-all disabled:opacity-50 shadow-lg"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
              Salvando...
            </span>
          ) : (
            "Atualizar Produto"
          )}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/produtos")}
          className="flex-1 bg-gray-100 text-gray-600 py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-all"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
