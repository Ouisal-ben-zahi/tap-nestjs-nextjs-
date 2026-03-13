import type { Metadata } from "next";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Inscription — TAP",
  description: "Créez votre compte TAP et accédez à nos outils d'employabilité propulsés par l'IA.",
};

export default function InscriptionPage() {
  return <RegisterForm />;
}
