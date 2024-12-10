// tailwind.config.js

module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'], 
  darkMode: false, 
  theme: {
    extend: {
      keyframes: {
        glitch: {
          '0%': { transform: 'translate(0)', opacity: '1' },
          '20%': { transform: 'translate(-2px, 2px)', opacity: '0.8' },
          '40%': { transform: 'translate(-2px, -2px)', opacity: '1' },
          '60%': { transform: 'translate(2px, 2px)', opacity: '0.8' },
          '80%': { transform: 'translate(2px, -2px)', opacity: '1' },
          '100%': { transform: 'translate(0)', opacity: '1' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(-10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'static-flicker': {
          '0%': { opacity: '0.8' },
          '10%': { opacity: '0.9' },
          '20%': { opacity: '0.85' },
          '30%': { opacity: '0.95' },
          '40%': { opacity: '0.7' },
          '50%': { opacity: '0.9' },
          '60%': { opacity: '0.8' },
          '70%': { opacity: '0.95' },
          '80%': { opacity: '0.85' },
          '90%': { opacity: '0.9' },
          '100%': { opacity: '0.8' },
        },
      },
      animation: {
        glitch: 'glitch 1s infinite',
        flicker: 'flicker 3s infinite',
        fadeIn: 'fadeIn 0.5s ease-in-out',
        'static-flicker': 'static-flicker 1.5s infinite',
      },
      backgroundImage: {
        'hacked-bg': 'url("/path-to-your-background-image.jpg")',
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
