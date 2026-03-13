import type { Metadata } from "next";
import AProposContent from "./AProposContent";

export const metadata: Metadata = {
  title: "À propos — TAP",
  description:
    "Découvrez la vision, la mission et l'ambition de TAP, la plateforme d'employabilité assistée par IA.",
};

export default function AProposPage() {
  return <AProposContent />;
}
