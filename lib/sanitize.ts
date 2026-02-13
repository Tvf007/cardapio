/**
 * Funções de sanitização para garantir que dados são válidos antes de enviar
 * para o backend. Isso previne erros de validação no servidor.
 */

import { MenuItem, Category } from "./validation";

/**
 * Sanitiza uma categoria removendo valores nulos/undefined
 * e garantindo que todos os campos obrigatórios estejam presentes
 */
export function sanitizeCategory(category: any): Category {
  if (!category || typeof category !== "object") {
    throw new Error("Categoria inválida");
  }

  // Garantir que order é sempre um número (coerce from string if needed)
  // CRÍTICO: Sempre tem que ter um valor numérico para garantir que seja enviado no JSON
  let order: number;
  if (typeof category.order === "number") {
    order = category.order;
  } else if (typeof category.order === "string") {
    const parsed = parseInt(category.order, 10);
    order = isNaN(parsed) ? 0 : parsed;
  } else {
    order = 0;
  }

  const sanitized: Category = {
    id: String(category.id || "").trim(),
    name: String(category.name || "").trim(),
    order, // SEMPRE incluir order com um valor numérico
    ...(category.created_at && { created_at: String(category.created_at) }),
  };

  // Validar campos obrigatórios
  if (!sanitized.id) {
    throw new Error("Categoria deve ter um ID válido");
  }

  if (!sanitized.name) {
    throw new Error("Categoria deve ter um nome válido");
  }

  return sanitized;
}

/**
 * Sanitiza um produto removendo valores nulos/undefined
 * e garantindo que todos os campos obrigatórios estejam presentes
 */
export function sanitizeProduct(product: any): MenuItem {
  if (!product || typeof product !== "object") {
    throw new Error("Produto inválido");
  }

  const sanitized: MenuItem = {
    id: String(product.id || "").trim(),
    name: String(product.name || "").trim(),
    description: String(product.description || "").trim(),
    price: Number(product.price) || 0,
    category: String(product.category || "").trim(),
    image: product.image ? String(product.image).trim() : "",
    available: product.available === true || product.available === 1,
    ...(product.created_at && { created_at: String(product.created_at) }),
    ...(product.updated_at && { updated_at: String(product.updated_at) }),
  };

  // Validar campos obrigatórios
  const errors: string[] = [];

  if (!sanitized.id) {
    errors.push("Produto deve ter um ID válido");
  }

  if (!sanitized.name) {
    errors.push("Produto deve ter um nome válido");
  }

  if (!sanitized.category) {
    errors.push("Produto deve ter uma categoria válida");
  }

  if (sanitized.price < 0) {
    errors.push("Preço deve ser maior ou igual a 0");
  }

  if (errors.length > 0) {
    throw new Error(`Produto inválido: ${errors.join(", ")}`);
  }

  return sanitized;
}

/**
 * Sanitiza um array de categorias
 */
export function sanitizeCategories(categories: any[]): Category[] {
  if (!Array.isArray(categories)) {
    throw new Error("Categorias deve ser um array");
  }

  return categories
    .filter((cat) => cat && typeof cat === "object")
    .map((cat, index) => {
      try {
        return sanitizeCategory(cat);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        throw new Error(`Categoria [${index}]: ${message}`);
      }
    });
}

/**
 * Sanitiza um array de produtos
 */
export function sanitizeProducts(products: any[]): MenuItem[] {
  if (!Array.isArray(products)) {
    throw new Error("Produtos deve ser um array");
  }

  return products
    .filter((prod) => prod && typeof prod === "object")
    .map((prod, index) => {
      try {
        return sanitizeProduct(prod);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        throw new Error(`Produto [${index}]: ${message}`);
      }
    });
}

/**
 * Valida e sanitiza dados antes de sincronizar
 * Retorna dados limpos e prontos para enviar ao backend
 */
export function validateAndSanitizeSyncData(
  products: any,
  categories: any
): { products: MenuItem[]; categories: Category[] } {
  try {
    const sanitizedCategories = sanitizeCategories(categories);
    const sanitizedProducts = sanitizeProducts(products);

    return {
      products: sanitizedProducts,
      categories: sanitizedCategories,
    };
  } catch (error) {
    throw error;
  }
}
