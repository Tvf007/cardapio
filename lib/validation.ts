import { z } from "zod";

// Schemas de validação com Zod
export const CategorySchema = z.object({
  id: z.string().min(1, "ID da categoria é obrigatório"),
  name: z.string().min(1, "Nome da categoria é obrigatório"),
  created_at: z.string().optional(),
});

export const MenuItemSchema = z.object({
  id: z.string().min(1, "ID do produto é obrigatório"),
  name: z.string().min(1, "Nome do produto é obrigatório"),
  description: z.string().min(0),
  price: z.coerce.number().positive("Preço deve ser maior que 0"),
  category: z.string().min(1, "Categoria é obrigatória"),
  image: z.string().url().or(z.string().startsWith("data:")),
  available: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// Schemas para respostas da API
export const SyncResponseSchema = z.object({
  categories: z.array(CategorySchema),
  products: z.array(MenuItemSchema),
});

export const SingleCategorySchema = CategorySchema;
export const SingleMenuItemSchema = MenuItemSchema;

// Tipos derivados dos schemas
export type Category = z.infer<typeof CategorySchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type SyncResponse = z.infer<typeof SyncResponseSchema>;

// Função para validar e fazer parse seguro
export function validateAndParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fieldName: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      throw new Error(`Erro ao validar ${fieldName}: ${messages}`);
    }
    throw error;
  }
}

// Função para validar múltiplos itens
export function validateArray<T>(
  schema: z.ZodSchema<T>,
  items: unknown[],
  fieldName: string
): T[] {
  if (!Array.isArray(items)) {
    throw new Error(`${fieldName} deve ser um array`);
  }
  return items.map((item, index) => {
    try {
      return schema.parse(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map((e) => e.message).join(", ");
        throw new Error(`Erro ao validar ${fieldName}[${index}]: ${messages}`);
      }
      throw error;
    }
  });
}
