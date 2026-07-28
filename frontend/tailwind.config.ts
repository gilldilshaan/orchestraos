import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./providers/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // shadcn semantic slots, remapped onto the OrchestraOS palette
        border: "var(--glass-border)",
        input: "var(--hairline)",
        ring: "var(--accent-blue)",
        background: "var(--bg-base)",
        foreground: "var(--text-primary)",
        primary: {
          DEFAULT: "var(--accent-blue)",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "var(--bg-surface-2)",
          foreground: "var(--text-primary)",
        },
        destructive: {
          DEFAULT: "var(--critical)",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "var(--bg-surface-1)",
          foreground: "var(--text-secondary)",
        },
        accent: {
          DEFAULT: "var(--bg-surface-2)",
          foreground: "var(--text-primary)",
        },
        card: {
          DEFAULT: "var(--glass-fill)",
          foreground: "var(--text-primary)",
        },
        // raw OrchestraOS design tokens (§3) for direct use
        "bg-base": "var(--bg-base)",
        "bg-surface-1": "var(--bg-surface-1)",
        "bg-surface-2": "var(--bg-surface-2)",
        "glass-fill": "var(--glass-fill)",
        "glass-border": "var(--glass-border)",
        hairline: "var(--hairline)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "accent-blue": "var(--accent-blue)",
        "accent-indigo": "var(--accent-indigo)",
        "accent-cyan": "var(--accent-cyan)",
        "accent-violet": "var(--accent-violet)",
        positive: "var(--positive)",
        warning: "var(--warning)",
        critical: "var(--critical)",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        sans: ["var(--font-geist-sans)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      fontSize: {
        display: ["64px", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        h1: ["32px", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        h2: ["22px", { lineHeight: "1.3" }],
        h3: ["16px", { lineHeight: "1.4" }],
        body: ["14px", { lineHeight: "1.6" }],
        caption: ["12px", { lineHeight: "1.5" }],
        tag: ["12px", { lineHeight: "1.4", letterSpacing: "0.02em" }],
      },
      borderRadius: {
        lg: "14px",
        md: "10px",
        sm: "6px",
      },
      backdropBlur: {
        glass: "20px",
      },
      spacing: {
        18: "4.5rem",
      },
      transitionTimingFunction: {
        micro: "cubic-bezier(0.4,0,0.2,1)",
        panel: "cubic-bezier(0.16,1,0.3,1)",
        expo: "cubic-bezier(0.16,1,0.3,1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-travel": {
          "0%": { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "200% 0%" },
        },
        "count-up-reveal": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-travel": "pulse-travel 1.6s linear infinite",
        "count-up-reveal": "count-up-reveal 0.4s cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
