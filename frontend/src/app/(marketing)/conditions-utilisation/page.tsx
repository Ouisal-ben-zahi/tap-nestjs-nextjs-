import type { Metadata } from "next";
import ConditionsContent from "./ConditionsContent";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — TAP",
  description: "Conditions générales d'utilisation de la plateforme TAP — droits, obligations et responsabilités.",
};

export default function ConditionsPage() {
  return <ConditionsContent />;
}
