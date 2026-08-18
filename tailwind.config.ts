import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config = {
  theme: {
    extend: {
      colors: {
        ink: "#12121A",
        cloud: "#F7F7FB",
        forge: "#6D5DFC",
        ember: "#FF6B5B",
        circuit: "#22D3EE",
        neutral: {
          50: "#F7F7FB",
          100: "#EEEEF4",
          200: "#DCDCE6",
          300: "#B8B8C8",
          400: "#9494A8",
          500: "#71718A",
          600: "#56566C",
          700: "#3F3F52",
          800: "#2A2A38",
          900: "#1C1C26",
          950: "#12121A",
        },
      },
      fontFamily: {
        heading: [
          "var(--font-heading)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        body: [
          "var(--font-body)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "JetBrains Mono",
          "ui-monospace",
          "monospace",
        ],
      },
      backgroundImage: {
        "gradient-forge":
          "linear-gradient(135deg, var(--color-forge, #6D5DFC) 0%, var(--color-circuit, #22D3EE) 100%)",
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        ".bg-gradient-forge": {
          backgroundImage: "linear-gradient(135deg, #6D5DFC 0%, #22D3EE 100%)",
        },
      });
    }),
  ],
} satisfies Config;

export default config;
