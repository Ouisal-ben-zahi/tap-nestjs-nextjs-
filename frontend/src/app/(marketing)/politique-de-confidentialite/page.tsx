import type { Metadata } from "next";
import PolitiqueContent from "./PolitiqueContent";

export const metadata: Metadata = {
  title: "Politique de confidentialité — TAP",
  description: "Politique de confidentialité de TAP — collecte, traitement et protection de vos données personnelles.",
};

export default function PolitiquePage() {
  return <PolitiqueContent />;
}
