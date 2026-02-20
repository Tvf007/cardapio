import { createClient, type Client } from "@libsql/client/web";

/**
 * Cliente Turso SQLite Cloud (modo HTTP/Web)
 * Substitui Supabase PostgreSQL
 *
 * IMPORTANTE: Usa "@libsql/client/web" em vez de "@libsql/client"
 * porque Netlify serverless não tem bindings nativos (linux-x64-gnu).
 * O modo web usa HTTP puro, perfeito para serverless.
 *
 * Benefícios:
 * - 8GB storage (vs 1GB Supabase)
 * - Unlimited egress (vs 10GB/mês limite)
 * - SQLite leve e rápido
 * - Zero custo para cardápio pequeno
 *
 * Usa lazy initialization para compatibilidade com Netlify
 * (módulos podem ser carregados antes das env vars estarem prontas)
 */

let _db: Client | null = null;

function getDb(): Client {
  if (_db) return _db;

  const databaseUrl = process.env.TURSO_CONNECTION_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!databaseUrl) {
    throw new Error(
      "TURSO_CONNECTION_URL não configurada. " +
      "Defina a variável de ambiente com a URL de conexão do Turso."
    );
  }

  if (!authToken) {
    throw new Error(
      "TURSO_AUTH_TOKEN não configurada. " +
      "Defina a variável de ambiente com o token de autenticação do Turso."
    );
  }

  _db = createClient({
    url: databaseUrl,
    authToken: authToken,
  });

  return _db;
}

// Getter para compatibilidade com código existente
export const db = new Proxy({} as Client, {
  get(_target, prop) {
    const realDb = getDb();
    const value = (realDb as any)[prop];
    if (typeof value === "function") {
      return value.bind(realDb);
    }
    return value;
  },
});

/**
 * Buscar todas as categorias
 */
export async function getCategories() {
  try {
    const result = await db.execute(
      "SELECT id, name, \"order\" FROM categories ORDER BY \"order\" ASC"
    );
    return result.rows || [];
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    throw error;
  }
}

/**
 * Buscar todos os produtos (menu items)
 */
export async function getMenuItems() {
  try {
    const result = await db.execute(
      "SELECT id, name, description, price, category, image, available, \"order\" FROM menu_items ORDER BY \"order\" ASC"
    );
    return result.rows || [];
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    throw error;
  }
}

/**
 * Buscar categorias e produtos (para /api/sync)
 */
export async function getCategoriesAndMenuItems() {
  try {
    const [categoriesResult, menuItemsResult] = await Promise.all([
      db.execute(
        "SELECT id, name, \"order\" FROM categories ORDER BY \"order\" ASC"
      ),
      db.execute(
        "SELECT id, name, description, price, category, image, available, \"order\" FROM menu_items ORDER BY \"order\" ASC"
      ),
    ]);

    return {
      categories: categoriesResult.rows || [],
      menuItems: menuItemsResult.rows || [],
    };
  } catch (error) {
    console.error("Erro ao buscar categorias e produtos:", error);
    throw error;
  }
}

/**
 * Sincronizar dados (upsert categories e menu_items)
 * Usa transactions para garantir consistência
 */
export async function syncData(
  categories: any[],
  menuItems: any[]
) {
  try {
    // Começar transaction
    await db.execute("BEGIN TRANSACTION");

    try {
      // Deletar categorias não incluídas
      const categoryIds = categories.map((c) => c.id);
      if (categoryIds.length > 0) {
        const placeholders = categoryIds.map(() => "?").join(",");
        await db.execute(
          `DELETE FROM categories WHERE id NOT IN (${placeholders})`,
          categoryIds as any
        );
      }

      // Deletar menu items não incluídos
      const menuItemIds = menuItems.map((m) => m.id);
      if (menuItemIds.length > 0) {
        const placeholders = menuItemIds.map(() => "?").join(",");
        await db.execute(
          `DELETE FROM menu_items WHERE id NOT IN (${placeholders})`,
          menuItemIds as any
        );
      }

      // Upsert categories
      for (const category of categories) {
        await db.execute(
          `INSERT INTO categories (id, name, "order")
           VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           "order" = excluded."order"`,
          [category.id, category.name, category.order ?? 999] as any
        );
      }

      // Upsert menu items (em batches para evitar travamento)
      const batchSize = 50;
      for (let i = 0; i < menuItems.length; i += batchSize) {
        const batch = menuItems.slice(i, i + batchSize);
        for (const item of batch) {
          await db.execute(
            `INSERT INTO menu_items (id, name, description, price, category, image, available, "order")
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             description = excluded.description,
             price = excluded.price,
             category = excluded.category,
             image = excluded.image,
             available = excluded.available,
             "order" = excluded."order"`,
            [
              item.id,
              item.name,
              item.description,
              item.price,
              item.category,
              item.image,
              item.available ? 1 : 0,
              item.order ?? 999,
            ] as any
          );
        }
      }

      // Commit transaction
      await db.execute("COMMIT");

      console.log("[TURSO] Sync completed successfully", {
        categoriesCount: categories.length,
        menuItemsCount: menuItems.length,
      });

      return {
        success: true,
        categoriesCount: categories.length,
        menuItemsCount: menuItems.length,
      };
    } catch (transactionError) {
      // Rollback em caso de erro
      await db.execute("ROLLBACK");
      throw transactionError;
    }
  } catch (error) {
    console.error("Erro ao sincronizar dados:", error);
    throw error;
  }
}

/**
 * Health check - verificar se banco está disponível
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await db.execute("SELECT 1");
    return true;
  } catch (error) {
    console.error("Health check falhou:", error);
    return false;
  }
}

// ========== Funções para /api/logo ==========

/**
 * Buscar logo salva (item especial __site_logo__)
 */
export async function getLogo(): Promise<string | null> {
  try {
    const result = await db.execute(
      'SELECT image FROM menu_items WHERE id = ?',
      ["__site_logo__"]
    );
    if (result.rows.length === 0) return null;
    return (result.rows[0].image as string) || null;
  } catch (error) {
    console.error("[TURSO] Erro ao buscar logo:", error);
    return null;
  }
}

/**
 * Salvar logo (upsert no menu_items)
 */
export async function saveLogo(logoData: string): Promise<void> {
  await db.execute(
    `INSERT INTO menu_items (id, name, description, price, category, image, available, "order")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
     image = excluded.image`,
    ["__site_logo__", "Logo", "", 0, "__hidden__", logoData, 0, 999]
  );
}

/**
 * Deletar logo
 */
export async function deleteLogo(): Promise<void> {
  await db.execute('DELETE FROM menu_items WHERE id = ?', ["__site_logo__"]);
}

// ========== Funções para /api/site-config ==========

/**
 * Buscar configuração do site
 */
export async function getSiteConfig(key: string): Promise<string | null> {
  try {
    const configId = `__site_config_${key}__`;
    const result = await db.execute(
      'SELECT description FROM menu_items WHERE id = ?',
      [configId]
    );
    if (result.rows.length === 0) return null;
    return (result.rows[0].description as string) || null;
  } catch (error) {
    console.error("[TURSO] Erro ao buscar config:", error);
    return null;
  }
}

/**
 * Salvar configuração do site
 */
export async function saveSiteConfig(key: string, value: string): Promise<void> {
  const configId = `__site_config_${key}__`;
  await db.execute(
    `INSERT INTO menu_items (id, name, description, price, category, image, available, "order")
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
     description = excluded.description,
     name = excluded.name`,
    [configId, `Config: ${key}`, value, 0, "__hidden__", "", 0, 999]
  );
}

// ========== Funções para /api/cleanup ==========

/**
 * Buscar e limpar categorias inválidas
 */
export async function cleanupInvalidCategories(): Promise<{
  totalChecked: number;
  deleted: number;
}> {
  const result = await db.execute('SELECT id, name FROM categories');
  const allCategories = result.rows;

  const invalidIds = allCategories.filter(
    (cat) => !cat.id || cat.id === null || cat.id === ""
  );

  if (invalidIds.length > 0) {
    await db.execute("DELETE FROM categories WHERE id IS NULL OR id = ''");
  }

  return {
    totalChecked: allCategories.length,
    deleted: invalidIds.length,
  };
}

// ========== Funções para /api/diagnostic ==========

/**
 * Diagnóstico de ordenação de categorias
 */
export async function diagnosticCategoriesOrder() {
  const result = await db.execute(
    'SELECT id, name, "order" FROM categories ORDER BY id'
  );
  return result.rows;
}

// ========== Funções para /api/init (inicializar banco) ==========

/**
 * Verificar se banco já tem dados
 */
export async function hasData(): Promise<boolean> {
  const result = await db.execute('SELECT id FROM categories LIMIT 1');
  return (result.rows.length > 0);
}

/**
 * Inserir dados iniciais (categories + menu_items)
 */
export async function initializeData(
  categories: Array<{ id: string; name: string; order?: number }>,
  menuItems: Array<{ id: string; name: string; description?: string; price: number; category: string; image?: string; available: boolean; order?: number }>
): Promise<{ categoriesCount: number; menuItemsCount: number }> {
  await db.execute("BEGIN TRANSACTION");
  try {
    for (const cat of categories) {
      await db.execute(
        `INSERT OR IGNORE INTO categories (id, name, "order") VALUES (?, ?, ?)`,
        [cat.id, cat.name, cat.order ?? 999]
      );
    }
    for (const item of menuItems) {
      await db.execute(
        `INSERT OR IGNORE INTO menu_items (id, name, description, price, category, image, available, "order")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, item.name, item.description || "", item.price, item.category, item.image || "", item.available ? 1 : 0, item.order ?? 999]
      );
    }
    await db.execute("COMMIT");
    return { categoriesCount: categories.length, menuItemsCount: menuItems.length };
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}
