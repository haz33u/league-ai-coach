import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0AC8B9",
        secondary: "#C89B3C",
        dark: "#0A0E27",
        glass: "rgba(255, 255, 255, 0.05)",
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          'from': { boxShadow: '0 0 20px rgba(10, 200, 185, 0.5)' },
          'to': { boxShadow: '0 0 40px rgba(10, 200, 185, 0.8)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
