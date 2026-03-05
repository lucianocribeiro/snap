import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "snap-bg": "#0B111A",
        "snap-surface": "#121A26",
        "snap-card": "#1A2433",
        "snap-border": "#2A3649",
        "snap-textMain": "#E6EDF7",
        "snap-textDim": "#9BAAC1",
      },
    },
  },
  plugins: [],
};

export default config;
