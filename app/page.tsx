import { redirect } from "next/navigation";

export default function Home() {
  // Redireciona para a página de boas-vindas
  redirect("/boas-vindas");
}
