"use client";

import { useState, FormEvent } from "react";
import { Mail, Phone, MapPin, CheckCircle2, Send } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const contactInfo = [
  { icon: Mail, label: "Email", value: "tap@entrepreneursmorocco.com", href: "mailto:tap@entrepreneursmorocco.com" },
  { icon: Phone, label: "Téléphone", value: "+212 7 76 86 81 63", href: "tel:+212776868163" },
  { icon: MapPin, label: "Adresse", value: "Immeuble STAVROULA, Gueliz\nMarrakech 40000, Maroc", href: "https://www.google.com/maps/search/?api=1&query=Immeuble+STAVROULA+gueliz+Marrakesh+4000" },
];

export default function ContactContent() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const containerRef = useScrollReveal();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch("https://formsubmit.co/ajax/tap@entrepreneursmorocco.com", { method: "POST", headers: { Accept: "application/json" }, body: data });
      if (res.ok) { setSent(true); form.reset(); }
    } catch { /* silent */ } finally { setSending(false); }
  }

  return (
    <div>
      <section className="relative min-h-[50vh] sm:min-h-[70vh] flex items-end overflow-hidden bg-black">
        <div className="absolute inset-0 z-0">
          <img src="/images/bgpages.webp" alt="Arrière-plan TAP" className="absolute inset-0 w-full h-full object-cover scale-105" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60" />
        </div>

        <div className="relative z-10 w-[88%] max-w-[1300px] mx-auto pb-14 sm:pb-20 pt-[140px] sm:pt-[180px]">
          <h1
            className="hero-fade-in font-heading text-[22px] sm:text-[38px] md:text-[52px] lg:text-[66px] font-extralight text-white tracking-[-0.03em] mb-4 sm:mb-5 leading-[1.05]"
            style={{ animationDelay: "0.3s" }}
          >
            Contactez-<span className="font-bold text-glow text-tap-red">nous</span>
          </h1>
          <p
            className="hero-fade-in text-[15px] md:text-[17px] text-white/45 max-w-[400px] leading-[1.7] font-light"
            style={{ animationDelay: "0.5s" }}
          >
            Une question ou un besoin ? Nous revenons vers vous rapidement.
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-black to-transparent z-[5]" />
      </section>

      <div ref={containerRef}>
        <section className="py-12 sm:py-24 bg-black relative overflow-hidden">
          <div className="absolute top-[20%] right-[-100px] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(202,27,40,0.03),transparent_60%)] blur-3xl" />
          <div className="max-w-[1300px] w-[88%] mx-auto relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-4 flex flex-col gap-3 reveal">
                {contactInfo.map((info, i) => (
                  <a
                    key={i}
                    href={info.href}
                    target={info.label === "Adresse" ? "_blank" : undefined}
                    rel={info.label === "Adresse" ? "noopener noreferrer" : undefined}
                    className="group card-solid rounded-xl flex items-center gap-4 p-5 flex-1"
                  >
                    <div className="w-10 h-10 rounded-xl bg-tap-red/[0.08] border border-tap-red/10 flex items-center justify-center shrink-0 group-hover:bg-tap-red/15 group-hover:border-tap-red/20 transition-all duration-500">
                      <info.icon size={16} className="text-tap-red" strokeWidth={1.5} />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-[2px] text-white/35 font-medium block mb-1">{info.label}</span>
                      <span className="text-[12px] text-white/50 group-hover:text-white/60 transition-colors duration-300 whitespace-pre-line leading-[1.5]">{info.value}</span>
                    </div>
                  </a>
                ))}
              </div>

              <div className="lg:col-span-8 reveal">
                {sent ? (
                  <div className="flex flex-col items-center justify-center card-solid rounded-2xl p-16 text-center h-full min-h-[350px]">
                    <div className="w-14 h-14 rounded-2xl bg-tap-red/[0.08] border border-tap-red/10 flex items-center justify-center mb-5">
                      <CheckCircle2 size={28} className="text-tap-red" />
                    </div>
                    <h3 className="font-heading font-bold text-[20px] text-white mb-2">Message envoyé</h3>
                    <p className="text-[13px] text-white/45 font-light">Nous revenons vers vous rapidement.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="card-solid rounded-2xl p-7 md:p-8">
                    <input type="hidden" name="_subject" value="Nouveau message depuis le site TAP" />
                    <input type="text" name="_honey" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="name" className="block text-[9px] text-white/35 uppercase tracking-[2px] font-medium mb-2">Nom et prénom</label>
                        <input id="name" name="name" type="text" required placeholder="Votre nom complet" className="input-premium" />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-[9px] text-white/35 uppercase tracking-[2px] font-medium mb-2">E-mail</label>
                        <input id="email" name="email" type="email" required placeholder="vous@email.com" className="input-premium" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="company" className="block text-[9px] text-white/35 uppercase tracking-[2px] font-medium mb-2">Entreprise (facultatif)</label>
                        <input id="company" name="company" type="text" placeholder="Nom de l'entreprise" className="input-premium" />
                      </div>
                      <div>
                        <label htmlFor="subject" className="block text-[9px] text-white/35 uppercase tracking-[2px] font-medium mb-2">Sujet</label>
                        <input id="subject" name="subject" type="text" required placeholder="Recrutement, partenariat..." className="input-premium" />
                      </div>
                    </div>

                    <div className="mb-6">
                      <label htmlFor="message" className="block text-[9px] text-white/35 uppercase tracking-[2px] font-medium mb-2">Message</label>
                      <textarea id="message" name="message" rows={5} required placeholder="Décrivez votre besoin." className="input-premium resize-none" />
                    </div>

                    <button type="submit" disabled={sending} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                      <Send size={13} />
                      {sending ? "Envoi..." : "Envoyer"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
