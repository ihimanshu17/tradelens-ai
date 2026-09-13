import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#090d16",
        foreground: "#f1f5f9",
        card: "#0f172a",
        "card-hover": "#1e293b",
        border: "#1e293b",
        primary: {
          DEFAULT: "#10b981",
          foreground: "#042f1a",
        },
        accent: {
          blue: "#38bdf8",
          purple: "#a855f7",
          amber: "#f59e0b",
        }
      },
    },
  },
  plugins: [],
};

export default config;
