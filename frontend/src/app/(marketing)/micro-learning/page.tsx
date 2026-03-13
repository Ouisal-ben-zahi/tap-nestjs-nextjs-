import type { Metadata } from "next";
import MicroLearningContent from "./MicroLearningContent";

export const metadata: Metadata = {
  title: "Micro-learning — TAP",
  description: "Des parcours de formation courts et ciblés, personnalisés par l'IA, pour combler les lacunes et booster l'employabilité.",
};

export default function MicroLearningPage() {
  return <MicroLearningContent />;
}
