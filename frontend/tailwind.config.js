/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0066cc',
          light: '#3385d6',
          dark: '#004fa3',
        },
        background: {
          DEFAULT: '#1a1a2e',
          card: '#16213e',
          elevated: '#0f3460',
        },
        accent: '#00d4ff',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        muted: '#6b7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
