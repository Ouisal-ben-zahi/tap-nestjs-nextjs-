import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Connexion — TAP",
  description: "Connectez-vous à votre espace TAP pour accéder à vos outils d'employabilité IA.",
};

export default function ConnexionPage() {
  return <LoginForm />;
}
