/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Safelist ensures these classes are always generated, even when used dynamically
  safelist: [
    'text-red-600',
    'text-blue-600',
    'font-bold',
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#13ec80",
        "primary-dark": "#0ea65a",
        "secondary": "#111814",
        "background-light": "#f6f8f7",
        "background-dark": "#102219",
        "surface-light": "#ffffff",
        "surface-dark": "#1a3326",
        "border-light": "#e0e7e4",
        "border-dark": "#2a4d3a",
      },
      fontFamily: {
        "display": ["Work Sans", "sans-serif"],
        "body": ["Work Sans", "sans-serif"],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(0, 0, 0, 0.03)',
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [],
}