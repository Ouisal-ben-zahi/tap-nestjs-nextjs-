"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LogIn, Eye, EyeOff, Mail, Lock } from "lucide-react";
import axios from "axios";

export default function LoginForm() {
  const login = useAuthStore((s) => s.login);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email, password });
      router.push("/app");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Connexion impossible");
      } else {
        setError(err instanceof Error ? err.message : "Connexion impossible");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[460px] hero-fade-in">
      <div className="glass rounded-3xl p-8 sm:p-10 relative overflow-hidden">
        {/* Card glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[1px] bg-gradient-to-r from-transparent via-tap-red/40 to-transparent" />

        <div className="text-center mb-9">
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-6 rounded-full bg-tap-red/[0.08] border border-tap-red/15">
            <LogIn size={13} className="text-tap-red" />
            <span className="text-[10px] uppercase tracking-[2.5px] text-tap-red/80 font-semibold">
              Candidat ou Recruteur
            </span>
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-bold text-white tracking-[-0.03em] font-heading">
            Connexion
          </h1>
          <p className="text-white/45 text-[14px] mt-2 font-light">
            Accédez à votre espace TAP
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-tap-red/8 border border-tap-red/15 rounded-xl px-4 py-3 text-tap-red text-[13px] backdrop-blur-sm">
              {error}
            </div>
          )}

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
                autoComplete="current-password"
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

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion...
                </span>
              ) : (
                <>
                  Se connecter
                  <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <Link href="/mot-de-passe-oublie" className="text-white/35 hover:text-white/60 text-[12px] transition-colors">
            Mot de passe oublié ?
          </Link>
        </div>

        <div className="mt-4 pt-6 border-t border-white/[0.06] text-center">
          <p className="text-white/45 text-[13px]">
            Pas encore de compte ?{" "}
            <Link href="/inscription" className="text-tap-red hover:text-tap-red-hover transition-colors font-medium">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
