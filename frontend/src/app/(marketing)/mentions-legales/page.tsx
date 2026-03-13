import type { Metadata } from "next";
import MentionsLegalesContent from "./MentionsLegalesContent";

export const metadata: Metadata = {
  title: "Mentions légales — TAP",
  description: "Mentions légales de la plateforme TAP — informations éditeur, hébergement et propriété intellectuelle.",
};

export default function MentionsLegalesPage() {
  return <MentionsLegalesContent />;
}
