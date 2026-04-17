import type { Config } from "tailwindcss";
import { nextui } from "@nextui-org/theme";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "surface-container-highest": "#dfe3e1",
        "secondary-fixed": "#b0f3a9",
        "primary-fixed-dim": "#7ddc7a",
        "inverse-primary": "#7ddc7a",
        "on-tertiary": "#ffffff",
        "primary-fixed": "#98f994",
        "tertiary-fixed": "#abf4ac",
        surface: "#f6faf7",
        "on-surface-variant": "#3f4a3d",
        "surface-variant": "#dfe3e1",
        "primary-container": "#268630",
        "on-secondary-container": "#326f34",
        error: "#ba1a1a",
        "surface-container-low": "#f1f5f2",
        tertiary: "#256931",
        "on-surface": "#181d1b",
        "on-secondary-fixed": "#002204",
        "surface-tint": "#006e1c",
        "tertiary-container": "#3f8247",
        secondary: "#2d6b30",
        "error-container": "#ffdad6",
        "on-primary-fixed-variant": "#005313",
        "on-primary-fixed": "#002204",
        "on-secondary-fixed-variant": "#12521a",
        "tertiary-fixed-dim": "#90d792",
        "secondary-fixed-dim": "#94d78f",
        "on-tertiary-fixed": "#002107",
        "on-tertiary-container": "#f7fff2",
        "on-error-container": "#93000a",
        "surface-container": "#ebefec",
        primary: "#006b1b",
        "on-background": "#181d1b",
        "inverse-on-surface": "#eef2ef",
        "secondary-container": "#adf0a6",
        background: "#f6faf7",
        "surface-container-lowest": "#ffffff",
        "surface-container-high": "#e5e9e6",
        "surface-dim": "#d7dbd8",
        "inverse-surface": "#2d3130",
        outline: "#6f7a6b",
        "outline-variant": "#bfcab9",
        "on-error": "#ffffff",
        "on-secondary": "#ffffff",
        "on-tertiary-fixed-variant": "#07521d",
        "on-primary-container": "#f7fff1",
        "surface-bright": "#f6faf7",
        /* App design system – use these for consistent UI */
        app: {
          primary: "var(--color-primary)",
          "primary-hover": "var(--color-primary-hover)",
          "primary-muted": "var(--color-primary-muted)",
          surface: "var(--color-surface)",
          "surface-alt": "var(--color-surface-alt)",
          title: "var(--color-title)",
          body: "var(--color-body)",
          "body-muted": "var(--color-body-muted)",
          "indicator-active": "var(--color-indicator-active)",
          "indicator-inactive": "var(--color-indicator-inactive)",
        },
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "1.5rem",
        full: "9999px",
      },
      fontFamily: {
        headline: ["Manrope"],
        body: ["Inter"],
        label: ["Inter"],
      },
    },
  },
  darkMode: "class",
  plugins: [
    nextui(),
    function ({ addUtilities }: any) {
      addUtilities({
        ".scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
      });
    },
  ],
};

export default config;
