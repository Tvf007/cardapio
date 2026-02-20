import { NextResponse } from "next/server";

export async function GET() {
  const result: Record<string, unknown> = {
    status: "OK",
    timestamp: new Date().toISOString(),
    tursoUrl: !!process.env.TURSO_CONNECTION_URL,
    tursoToken: !!process.env.TURSO_AUTH_TOKEN,
  };

  // Tentar criar cliente Turso diretamente
  try {
    const { createClient } = await import("@libsql/client");

    const url = process.env.TURSO_CONNECTION_URL;
    const token = process.env.TURSO_AUTH_TOKEN;

    if (!url || !token) {
      result.error = "Missing env vars";
      result.urlLen = url?.length || 0;
      result.tokenLen = token?.length || 0;
      return NextResponse.json(result, { status: 500 });
    }

    const client = createClient({ url, authToken: token });
    const res = await client.execute("SELECT COUNT(*) as cnt FROM categories");
    result.categoriesCount = res.rows[0]?.cnt;

    const res2 = await client.execute("SELECT COUNT(*) as cnt FROM menu_items");
    result.menuItemsCount = res2.rows[0]?.cnt;

    result.tursoWorking = true;
  } catch (error) {
    result.tursoWorking = false;
    result.tursoError = error instanceof Error ? error.message : String(error);
    result.tursoStack = error instanceof Error ? error.stack?.split("\n").slice(0, 5) : undefined;
  }

  return NextResponse.json(result);
}
