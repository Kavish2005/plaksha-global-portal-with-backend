/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        plaksha: {
          teal: "#007878",
          gold: "#DDB05D",
          dark: "#333333",
        },
      },
    },
  },
  plugins: [],
}