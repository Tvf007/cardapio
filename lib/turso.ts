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
    // FIX: Usar fetch nativo ao invés de cross-fetch (que depende de https.request)
    // Cloudflare Workers tem fetch nativo, não precisa de polyfill
    fetch: globalThis.fetch,
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
 * Usa db.batch() para execução atômica em um único request HTTP
 *
 * IMPORTANTE: O cliente HTTP (@libsql/client/web) abre um novo stream
 * por cada execute(), então BEGIN/COMMIT/ROLLBACK manuais NÃO funcionam.
 * db.batch(statements, "write") envia tudo em um único request HTTP
 * e faz BEGIN/COMMIT/ROLLBACK internamente.
 */
export async function syncData(
  categories: any[],
  menuItems: any[]
) {
  try {
    // Montar todos os statements para execução atômica
    const statements: Array<{ sql: string; args: any[] }> = [];

    // Deletar categorias não incluídas (preservar categorias de sistema como __hidden__)
    const categoryIds = categories.map((c) => c.id);
    if (categoryIds.length > 0) {
      const placeholders = categoryIds.map(() => "?").join(",");
      statements.push({
        sql: `DELETE FROM categories WHERE id NOT IN (${placeholders}) AND substr(id, 1, 2) != '__'`,
        args: categoryIds,
      });
    }

    // Deletar menu items não incluídos (preservar itens de sistema: __site_logo__, __site_config_*)
    const menuItemIds = menuItems.map((m) => m.id);
    if (menuItemIds.length > 0) {
      const placeholders = menuItemIds.map(() => "?").join(",");
      statements.push({
        sql: `DELETE FROM menu_items WHERE id NOT IN (${placeholders}) AND substr(id, 1, 2) != '__'`,
        args: menuItemIds,
      });
    }

    // Upsert categories
    for (const category of categories) {
      statements.push({
        sql: `INSERT INTO categories (id, name, "order")
         VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         "order" = excluded."order"`,
        args: [category.id, category.name, category.order ?? 999],
      });
    }

    // Upsert menu items
    for (const item of menuItems) {
      statements.push({
        sql: `INSERT INTO menu_items (id, name, description, price, category, image, available, "order")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         price = excluded.price,
         category = excluded.category,
         image = excluded.image,
         available = excluded.available,
         "order" = excluded."order"`,
        args: [
          item.id,
          item.name,
          item.description,
          item.price,
          item.category,
          item.image,
          item.available ? 1 : 0,
          item.order ?? 999,
        ],
      });
    }

    // Executar tudo atomicamente em um único request HTTP
    await db.batch(statements, "write");

    console.log("[TURSO] Sync completed successfully", {
      categoriesCount: categories.length,
      menuItemsCount: menuItems.length,
    });

    return {
      success: true,
      categoriesCount: categories.length,
      menuItemsCount: menuItems.length,
    };
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

// ========== Funções para /api/adicionais ==========

/**
 * Inicializar tabelas de adicionais (auto-migrate)
 */
export async function initAdicionaisTables(): Promise<void> {
  try {
    await db.batch([
      {
        sql: `CREATE TABLE IF NOT EXISTS adicionais (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          price REAL NOT NULL DEFAULT 0
        )`,
        args: [],
      },
      {
        sql: `CREATE TABLE IF NOT EXISTS product_adicionais (
          product_id TEXT NOT NULL,
          adicional_id TEXT NOT NULL,
          PRIMARY KEY (product_id, adicional_id)
        )`,
        args: [],
      },
    ], "write");
  } catch (error) {
    console.error("[TURSO] Erro ao inicializar tabelas de adicionais:", error);
    throw error;
  }
}

/**
 * Buscar todos os adicionais
 */
export async function getAdicionais(): Promise<Array<{ id: string; name: string; price: number }>> {
  await initAdicionaisTables();
  const result = await db.execute(
    "SELECT id, name, price FROM adicionais ORDER BY name ASC"
  );
  return result.rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    price: r.price as number,
  }));
}

/**
 * Buscar adicionais de um produto específico
 */
export async function getAdicionaisForProduct(productId: string): Promise<Array<{ id: string; name: string; price: number }>> {
  await initAdicionaisTables();
  const result = await db.execute(
    `SELECT a.id, a.name, a.price
     FROM adicionais a
     INNER JOIN product_adicionais pa ON a.id = pa.adicional_id
     WHERE pa.product_id = ?
     ORDER BY a.name ASC`,
    [productId]
  );
  return result.rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    price: r.price as number,
  }));
}

/**
 * Buscar IDs dos adicionais associados a um produto
 */
export async function getProductAdicionaisIds(productId: string): Promise<string[]> {
  await initAdicionaisTables();
  const result = await db.execute(
    "SELECT adicional_id FROM product_adicionais WHERE product_id = ?",
    [productId]
  );
  return result.rows.map(r => r.adicional_id as string);
}

/**
 * Criar novo adicional
 */
export async function createAdicional(id: string, name: string, price: number): Promise<void> {
  await initAdicionaisTables();
  await db.execute(
    "INSERT INTO adicionais (id, name, price) VALUES (?, ?, ?)",
    [id, name, price]
  );
}

/**
 * Atualizar adicional existente
 */
export async function updateAdicional(id: string, name: string, price: number): Promise<void> {
  await db.execute(
    "UPDATE adicionais SET name = ?, price = ? WHERE id = ?",
    [name, price, id]
  );
}

/**
 * Deletar adicional (e seus vínculos com produtos)
 */
export async function deleteAdicional(id: string): Promise<void> {
  await db.batch([
    { sql: "DELETE FROM product_adicionais WHERE adicional_id = ?", args: [id] },
    { sql: "DELETE FROM adicionais WHERE id = ?", args: [id] },
  ], "write");
}

/**
 * Definir adicionais de um produto (substitui todos os existentes)
 */
export async function setProductAdicionais(productId: string, adicionalIds: string[]): Promise<void> {
  await initAdicionaisTables();
  const statements: Array<{ sql: string; args: any[] }> = [
    { sql: "DELETE FROM product_adicionais WHERE product_id = ?", args: [productId] },
    ...adicionalIds.map(aid => ({
      sql: "INSERT OR IGNORE INTO product_adicionais (product_id, adicional_id) VALUES (?, ?)",
      args: [productId, aid],
    })),
  ];
  await db.batch(statements, "write");
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
 * Usa db.batch() para execução atômica (mesmo motivo do syncData)
 */
export async function initializeData(
  categories: Array<{ id: string; name: string; order?: number }>,
  menuItems: Array<{ id: string; name: string; description?: string; price: number; category: string; image?: string; available: boolean; order?: number }>
): Promise<{ categoriesCount: number; menuItemsCount: number }> {
  const statements: Array<{ sql: string; args: any[] }> = [];

  for (const cat of categories) {
    statements.push({
      sql: `INSERT OR IGNORE INTO categories (id, name, "order") VALUES (?, ?, ?)`,
      args: [cat.id, cat.name, cat.order ?? 999],
    });
  }
  for (const item of menuItems) {
    statements.push({
      sql: `INSERT OR IGNORE INTO menu_items (id, name, description, price, category, image, available, "order")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [item.id, item.name, item.description || "", item.price, item.category, item.image || "", item.available ? 1 : 0, item.order ?? 999],
    });
  }

  await db.batch(statements, "write");
  return { categoriesCount: categories.length, menuItemsCount: menuItems.length };
}
