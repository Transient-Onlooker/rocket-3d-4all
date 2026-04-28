import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#08111f',
        sky: '#d6ecff',
        flare: '#ff9f4a',
        panel: '#10213a',
      },
    },
  },
  plugins: [],
} satisfies Config;
