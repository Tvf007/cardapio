import { NextResponse } from "next/server";

// SECURITY: Endpoint de signup DESABILITADO
// Não deve ser possível criar novas contas admin pela API pública
export async function POST() {
  return NextResponse.json(
    { error: "Criação de contas desabilitada" },
    { status: 403 }
  );
}
