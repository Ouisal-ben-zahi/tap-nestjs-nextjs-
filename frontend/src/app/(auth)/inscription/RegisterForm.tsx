"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Sparkles, User, Building2, Mail, ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import axios from "axios";

type Step = "form" | "verify";

export default function RegisterForm() {
  const sendVerification = useAuthStore((s) => s.sendVerification);
  const verifyAndRegister = useAuthStore((s) => s.verifyAndRegister);
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");
  const [role, setRole] = useState<"candidat" | "recruteur">("candidat");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const getErrorMsg = (err: unknown) => {
    if (axios.isAxiosError(err)) return err.response?.data?.message || "Erreur";
    return err instanceof Error ? err.message : "Erreur";
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setLoading(true);
    try {
      await sendVerification({ email, password, role });
      setStep("verify");
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyAndRegister({ email, code });
      router.push("/app");
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  if (step === "verify") {
    return (
      <div className="w-full max-w-[460px] hero-fade-in">
        <div className="glass rounded-3xl p-8 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[1px] bg-gradient-to-r from-transparent via-tap-red/40 to-transparent" />

          <div className="text-center mb-9">
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-6 rounded-full bg-tap-red/[0.08] border border-tap-red/15">
              <Mail size={13} className="text-tap-red" />
              <span className="text-[10px] uppercase tracking-[2.5px] text-tap-red/80 font-semibold">
                Vérification
              </span>
            </div>
            <h1 className="text-[28px] sm:text-[34px] font-bold text-white tracking-[-0.03em] font-heading">
              Vérifiez votre email
            </h1>
            <p className="text-white/45 text-[14px] mt-2 font-light">
              Un code à 6 chiffres a été envoyé à <span className="text-white/70">{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-5">
            {error && (
              <div className="bg-tap-red/8 border border-tap-red/15 rounded-xl px-4 py-3 text-tap-red text-[13px] backdrop-blur-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="code" className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2.5">
                Code de vérification
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="input-premium text-center text-2xl tracking-[8px]"
                placeholder="000000"
                required
                autoFocus
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Vérification...
                  </span>
                ) : (
                  <>
                    Créer mon compte
                    <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </form>

          <button
            onClick={() => { setStep("form"); setError(""); setCode(""); }}
            className="mt-6 flex items-center gap-2 mx-auto text-white/35 hover:text-white/60 text-[12px] transition-colors"
          >
            <ArrowLeft size={12} />
            Modifier les informations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[460px] hero-fade-in">
      <div className="glass rounded-3xl p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[1px] bg-gradient-to-r from-transparent via-tap-red/40 to-transparent" />

        <div className="text-center mb-9">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-6 rounded-full bg-tap-red/[0.08] border border-tap-red/15">
            <Sparkles size={12} className="text-tap-red" />
            <span className="text-[10px] uppercase tracking-[2.5px] text-tap-red/80 font-semibold">
              Rejoindre TAP
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-bold text-white tracking-[-0.03em] font-heading">
            Créer un compte
          </h1>
          <p className="text-white/45 text-[14px] mt-2 font-light">
            {role === "candidat"
              ? "Boostez votre employabilité avec l'IA"
              : "Trouvez les meilleurs talents avec l'IA"}
          </p>
        </div>

        <form onSubmit={handleSendCode} className="space-y-5">
          {error && (
            <div className="bg-tap-red/8 border border-tap-red/15 rounded-xl px-4 py-3 text-tap-red text-[13px] backdrop-blur-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2.5">
              Je suis
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("candidat")}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-[13px] transition-all duration-300 cursor-pointer ${
                  role === "candidat"
                    ? "bg-tap-red/8 border-tap-red/25 text-white"
                    : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/[0.12]"
                }`}
              >
                <User size={16} strokeWidth={role === "candidat" ? 2 : 1.5} />
                Candidat
              </button>
              <button
                type="button"
                onClick={() => setRole("recruteur")}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-[13px] transition-all duration-300 cursor-pointer ${
                  role === "recruteur"
                    ? "bg-tap-red/8 border-tap-red/25 text-white"
                    : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/[0.12]"
                }`}
              >
                <Building2 size={16} strokeWidth={role === "recruteur" ? 2 : 1.5} />
                Recruteur
              </button>
            </div>
          </div>

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

          <div>
            <label htmlFor="password" className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2.5">
              Mot de passe
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-white/40">
                <Lock size={16} />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-premium"
                style={{ paddingLeft: "44px", paddingRight: "44px" }}
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50 hover:text-white/80 transition-colors"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-[10px] font-semibold uppercase tracking-[2px] text-white/40 mb-2.5">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-white/40">
                <Lock size={16} />
              </span>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-premium"
                style={{ paddingLeft: "44px", paddingRight: "44px" }}
                placeholder="••••••••"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50 hover:text-white/80 transition-colors"
                aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Envoi du code...
                </span>
              ) : (
                <>
                  Continuer
                  <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-white/[0.06] text-center">
          <p className="text-white/45 text-[13px]">
            Déjà un compte ?{" "}
            <Link href="/connexion" className="text-tap-red hover:text-tap-red-hover transition-colors font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
