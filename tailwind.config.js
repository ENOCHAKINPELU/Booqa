/** @type {import('tailwindcss').Config} */
// Palette re-anchored to the real Booqa logo (public/booqa-logo.png) - every
// value below was pixel-sampled from the actual artwork, not eyeballed:
// the mark's royal blue sampled to #10308F, its gold to #F8C410. The
// `primary` scale is a tint/shade ramp built around that exact blue so
// buttons, hovers, and soft backgrounds all read as one consistent brand
// color instead of the previous mismatch (a brighter sky-blue "primary"
// next to an unrelated cyan "accent" that didn't match the logo at all).
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF0FA',
          100: '#DCE1F5',
          200: '#B9C4EB',
          300: '#8FA0DD',
          400: '#5B72C8',
          500: '#2F49AC',
          600: '#1B3595',
          700: '#10308F', // exact logo blue
          800: '#0B2570',
          900: '#081C57',
        },
        navy: '#10308F', // alias of primary-700 - the logo has one blue, not two
        accent: '#F8C410', // exact logo gold
        'accent-dark': '#D9A80D', // hover/pressed state for gold elements
        'accent-soft': '#FDF3D9', // light gold tint for backgrounds/badges
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Headings on the corporate site (rounded geometric display face).
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        // Smooth ease-out used for reveals and hovers across the corporate site.
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        // Corporate site: gentle bob for floating UI cards.
        bob: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        // Hand-drawn underline drawing itself in under the headline.
        draw: {
          '0%': { strokeDashoffset: '320' },
          '100%': { strokeDashoffset: '0' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        // Slow cinematic drift for the hero background photos - see
        // HeroCarousel.jsx. Runs continuously on every image regardless of
        // which is currently visible (crossfade handles visibility), so
        // there's never a jump-cut when the active photo changes.
        kenburns: {
          '0%': { transform: 'scale(1) translate3d(0,0,0)' },
          '100%': { transform: 'scale(1.09) translate3d(-0.5%, -0.5%, 0)' },
        },
        // Gentle vertical drift for the floating hotel cards - see
        // FloatingHotelCards.jsx. Gives the stack a "breathing" feel
        // without ever being fast enough to distract from the search form.
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        // One-shot entrance for the hero's text column on load - not a
        // loop, just a soft lift-and-fade so the page doesn't feel static
        // the instant it paints.
        heroFadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        bob: 'bob 6s ease-in-out infinite',
        draw: 'draw 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both',
        fadeUp: 'fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) both',
        popIn: 'popIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        kenburns: 'kenburns 14s ease-out infinite alternate',
        float: 'float 6s ease-in-out infinite',
        heroFadeIn: 'heroFadeIn 0.7s ease-out',
      },
    },
  },
  plugins: [],
};
