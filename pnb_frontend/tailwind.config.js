/** @type {import('tailwindcss').Config} */
export default {
  content:[
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pnb: {
          maroon: '#9b1c31', // PNB Official Deep Red
          dark: '#6a0dad',
          gold: '#f6a01f',   // PNB Official Gold/Yellow
          lightGold: '#fcd34d',
          bg: '#f8f9fa'      // Light gray background for clean data reading
        }
      }
    },
  },
  plugins:[],
}
