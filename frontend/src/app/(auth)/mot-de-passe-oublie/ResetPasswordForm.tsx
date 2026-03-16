"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowLeft, KeyRound, Mail, ShieldCheck } from "lucide-react";
import axios from "axios";

type Step = "email" | "code" | "newPassword";

export default function ResetPasswordForm() {
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const getErrorMsg = (err: unknown) => {
    if (axios.isAxiosError(err)) return err.response?.data?.message || "Erreur";
    return err instanceof Error ? err.message : "Erreur";
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset({ email });
      setStep("code");
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) setStep("newPassword");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ email, code, newPassword });
      router.push("/connexion");
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const stepConfig = {
    email: { icon: Mail, badge: "Récupération", title: "Mot de passe oublié", desc: "Entrez votre email pour recevoir un code" },
    code: { icon: ShieldCheck, badge: "Vérification", title: "Vérifiez votre email", desc: `Un code à 6 chiffres a été envoyé à ${email}` },
    newPassword: { icon: KeyRound, badge: "Nouveau mot de passe", title: "Réinitialisez", desc: "Choisissez un nouveau mot de passe sécurisé" },
  };

  const current = stepConfig[step];
  const Icon = current.icon;

  return (
    <div className="w-full max-w-[460px] hero-fade-in">
      <div className="glass rounded-3xl p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[1px] bg-gradient-to-r from-transparent via-tap-red/40 to-transparent" />

        <div className="text-center mb-9">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-6 rounded-full bg-tap-red/[0.08] border border-tap-red/15">
            <Icon size={13} className="text-tap-red" />
            <span className="text-[10px] uppercase tracking-[2.5px] text-tap-red/80 font-semibold">
              {current.badge}
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-bold text-white tracking-[-0.03em] font-heading">
            {current.title}
          </h1>
          <p className="text-white/45 text-[14px] mt-2 font-light">{current.desc}</p>
        </div>

        {error && (
          <div className="bg-tap-red/8 border border-tap-red/15 rounded-xl px-4 py-3 text-tap-red text-[13px] backdrop-blur-sm mb-5">
            {error}
          </div>
        )}

        {step === "email" && (
          <form onSubmit={handleRequestCode} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2.5">
                Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-white/40">
                  <Mail size={16} />
                </span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-premium"
                  style={{ paddingLeft: "44px" }}
                  placeholder="votre@email.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="pt-2">
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed group">
                {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Envoi...</span> : <>Envoyer le code<ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" /></>}
              </button>
            </div>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleSubmitCode} className="space-y-5">
            <div>
              <label htmlFor="code" className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2.5">Code de vérification</label>
              <input id="code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="input-premium text-center text-2xl tracking-[8px]" placeholder="000000" required autoFocus />
            </div>
            <div className="pt-2">
              <button type="submit" disabled={code.length !== 6} className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed group">Continuer<ArrowRight size={14} /></button>
            </div>
          </form>
        )}

        {step === "newPassword" && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label htmlFor="newPassword" className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2.5">Nouveau mot de passe</label>
              <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-premium" placeholder="••••••••" required minLength={8} autoComplete="new-password" />
            </div>
            <div>
              <label htmlFor="confirmNewPassword" className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2.5">Confirmer</label>
              <input id="confirmNewPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-premium" placeholder="••••••••" required minLength={8} autoComplete="new-password" />
            </div>
            <div className="pt-2">
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed group">
                {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Réinitialisation...</span> : <>Réinitialiser<ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" /></>}
              </button>
            </div>
          </form>
        )}

        {step !== "email" && (
          <button onClick={() => { setStep(step === "newPassword" ? "code" : "email"); setError(""); }} className="mt-6 flex items-center gap-2 mx-auto text-white/35 hover:text-white/60 text-[12px] transition-colors">
            <ArrowLeft size={12} />Retour
          </button>
        )}

        <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
          <p className="text-white/45 text-[13px]">
            <Link href="/connexion" className="text-tap-red hover:text-tap-red-hover transition-colors font-medium">
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
