import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--color-background) / <alpha-value>)",
        foreground: "hsl(var(--color-foreground) / <alpha-value>)",
        border: "hsl(var(--color-border) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--color-primary) / <alpha-value>)",
          foreground: "hsl(var(--color-primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--color-secondary) / <alpha-value>)",
          foreground: "hsl(var(--color-secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--color-muted) / <alpha-value>)",
          foreground: "hsl(var(--color-muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--color-accent) / <alpha-value>)",
          foreground: "hsl(var(--color-accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--color-destructive) / <alpha-value>)",
          foreground: "hsl(var(--color-destructive-foreground) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;