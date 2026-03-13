import type { Metadata } from "next";
import ScoreContent from "./ScoreContent";

export const metadata: Metadata = {
  title: "Score d'employabilité — TAP",
  description: "Un score objectif et transparent qui évalue le potentiel d'employabilité de chaque candidat selon les critères du marché marocain.",
};

export default function ScorePage() {
  return <ScoreContent />;
}
