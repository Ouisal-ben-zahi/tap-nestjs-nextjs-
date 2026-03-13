import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        tap: {
          black: "#050505",
          surface: "#0A0A0A",
          card: "#111111",
          border: "#1A1A1A",
          red: "#DC2626",
          "red-hover": "#EF4444",
          blue: "#3B82F6",
          text: "#F5F5F5",
          muted: "#737373",
          subtle: "#404040",
        },
      },
      fontFamily: {
        heading: ["var(--font-jakarta)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        pixel: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "pixel-fade": "pixelFade 0.6s ease-out forwards",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "grid-scroll": "gridScroll 20s linear infinite",
      },
      keyframes: {
        pixelFade: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(220, 38, 38, 0.1)" },
          "50%": { boxShadow: "0 0 40px rgba(220, 38, 38, 0.3)" },
        },
        gridScroll: {
          "0%": { transform: "translate(0, 0)" },
          "100%": { transform: "translate(32px, 32px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
