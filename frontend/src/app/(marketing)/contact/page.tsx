import type { Metadata } from "next";
import ContactContent from "./ContactContent";

export const metadata: Metadata = {
  title: "Contact — TAP",
  description:
    "Contactez l'équipe TAP pour vos besoins de recrutement, partenariats ou toute question.",
};

export default function ContactPage() {
  return <ContactContent />;
}
