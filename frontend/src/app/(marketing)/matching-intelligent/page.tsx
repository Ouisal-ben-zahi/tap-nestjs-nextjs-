import type { Metadata } from "next";
import MatchingContent from "./MatchingContent";

export const metadata: Metadata = {
  title: "Matching intelligent — TAP",
  description: "Notre algorithme IA connecte les bons candidats aux bonnes entreprises, en analysant la compatibilité au-delà du simple CV.",
};

export default function MatchingPage() {
  return <MatchingContent />;
}
