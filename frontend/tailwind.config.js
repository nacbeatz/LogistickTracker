/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#248FCE',
          50: '#EBF6FB',
          100: '#C7E6F5',
          200: '#9ED1ED',
          300: '#6BBCE4',
          400: '#3EA7DA',
          500: '#248FCE',
          600: '#1E7BB3',
          700: '#196799',
          800: '#13527E',
          900: '#0D3D63',
        },
        accent: {
          DEFAULT: '#E25D2D',
          50: '#FDF1EC',
          100: '#FBDDD1',
          200: '#F7BBA3',
          300: '#F29975',
          400: '#EB7750',
          500: '#E25D2D',
          600: '#CC5024',
          700: '#B3441C',
          800: '#993814',
          900: '#7A2C0E',
        },
        success: '#4CAF50',
        warning: '#FFC107',
        error: '#F44336',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
