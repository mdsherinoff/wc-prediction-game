/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pitch: "#0b3d2e",
        turf: "#1f6e4a",
        chalk: "#f5f3ec",
        amber: "#e8a33d",
        ink: "#13261f",
        red: "#c4453a",
        line: "#d8d3c3",
      },
      fontWeight: {
        500: "500",
        600: "600",
        700: "700",
        800: "800",
      },
    },
  },
  plugins: [],
};
