import type { Metadata } from "next";
import EquipeContent from "./EquipeContent";

export const metadata: Metadata = {
  title: "L'équipe — TAP",
  description:
    "Découvrez l'équipe fondatrice de TAP : experts en IA, marketing, design et ingénierie.",
};

export default function EquipePage() {
  return <EquipeContent />;
}
