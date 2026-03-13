import type { Metadata } from "next";
import AnalyseCvContent from "./AnalyseCvContent";

export const metadata: Metadata = {
  title: "Analyse IA du CV — TAP",
  description: "Notre IA analyse en profondeur chaque CV pour extraire compétences, expériences et potentiel. Un diagnostic complet en quelques secondes.",
};

export default function AnalyseCvPage() {
  return <AnalyseCvContent />;
}
