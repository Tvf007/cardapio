import { redirect } from "next/navigation";

export default async function Home() {
  // Redireciona para boas-vindas de forma síncrona no servidor
  redirect("/boas-vindas");
}
