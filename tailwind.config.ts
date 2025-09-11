// tailwind.config.ts

import type { Config } from 'tailwindcss'
import colors from 'tailwindcss/colors' // Import the default colors module

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // --- FIX: Override the default color palette to force hex values ---
    // This prevents Tailwind CSS v4 alpha from using oklch(), 
    // which html2canvas does not support.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: colors.black,
      white: colors.white,
      // We are mapping the color names used in the app (e.g., 'gray') 
      // to a specific hex-based palette from the defaults (e.g., 'slate').
      gray: colors.slate, 
      green: colors.emerald,
      red: colors.red,
      blue: colors.blue,
      orange: colors.orange,
    },
    extend: {
      // Extensions can still be used, but the base colors are now defined above.
    },
  },
  plugins: [],
} satisfies Config
