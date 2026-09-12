/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep indigo — night sky over a Danish winter shakha, also a
        // traditional indigo-dye blue. Primary text, nav, headings.
        ink: {
          DEFAULT: '#1B2A4A',
          light: '#3D4A68',
          muted: '#6B7590',
        },
        // Warm sandstone paper — background. Shifted warmer/more ochre
        // than the generic cream default.
        paper: {
          DEFAULT: '#F5F0E2',
          raised: '#FBF8F0',
        },
        // Marigold — the flame accent. Used sparingly: CTAs, active states.
        marigold: {
          DEFAULT: '#E08D3C',
          dark: '#C06F28',
        },
        // Vermilion — flame tip / alerts / "no" states.
        vermilion: '#A23B2E',
        // Sage — confirmed / "yes" states, a quiet third accent.
        sage: '#5C7A5E',
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '0.75rem',
      },
    },
  },
  plugins: [],
};
