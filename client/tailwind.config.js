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
        'glitch-intense': {
          '0%': { transform: 'translate(0) skewX(0deg)', clipPath: 'inset(0 0 0 0)' },
          '10%': { transform: 'translate(-5px, 3px) skewX(-2deg)', clipPath: 'inset(10% 0 60% 0)' },
          '20%': { transform: 'translate(3px, -2px) skewX(1deg)', clipPath: 'inset(40% 0 30% 0)' },
          '30%': { transform: 'translate(-3px, 1px) skewX(-1deg)', clipPath: 'inset(70% 0 10% 0)' },
          '40%': { transform: 'translate(4px, -3px) skewX(2deg)', clipPath: 'inset(20% 0 50% 0)' },
          '50%': { transform: 'translate(-2px, 2px) skewX(0deg)', clipPath: 'inset(0 0 0 0)' },
          '60%': { transform: 'translate(3px, -1px) skewX(-1deg)', clipPath: 'inset(50% 0 20% 0)' },
          '70%': { transform: 'translate(-4px, 3px) skewX(2deg)', clipPath: 'inset(30% 0 40% 0)' },
          '80%': { transform: 'translate(2px, -2px) skewX(-2deg)', clipPath: 'inset(60% 0 20% 0)' },
          '90%': { transform: 'translate(-3px, 1px) skewX(1deg)', clipPath: 'inset(10% 0 70% 0)' },
          '100%': { transform: 'translate(0) skewX(0deg)', clipPath: 'inset(0 0 0 0)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'flicker-fast': {
          '0%': { opacity: '1' },
          '5%': { opacity: '0.2' },
          '10%': { opacity: '1' },
          '15%': { opacity: '0.4' },
          '20%': { opacity: '1' },
          '50%': { opacity: '1' },
          '55%': { opacity: '0.3' },
          '60%': { opacity: '1' },
          '100%': { opacity: '1' },
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
        'scan-line': {
          '0%': { top: '-10%' },
          '100%': { top: '110%' },
        },
        'hex-float': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)', opacity: '0.3' },
          '50%': { transform: 'translateY(-20px) rotate(180deg)', opacity: '0.6' },
        },
        'data-stream': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' },
        },
        'circuit-pulse': {
          '0%, 100%': { strokeDashoffset: '1000', opacity: '0.3' },
          '50%': { strokeDashoffset: '0', opacity: '1' },
        },
        'matrix-rain': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '0.5' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        'rotate-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'color-shift': {
          '0%': { filter: 'hue-rotate(0deg)' },
          '100%': { filter: 'hue-rotate(360deg)' },
        },
      },
      animation: {
        glitch: 'glitch 1s infinite',
        'glitch-intense': 'glitch-intense 0.5s infinite',
        flicker: 'flicker 3s infinite',
        'flicker-fast': 'flicker-fast 2s infinite',
        fadeIn: 'fadeIn 0.5s ease-in-out',
        'static-flicker': 'static-flicker 1.5s infinite',
        'scan-line': 'scan-line 3s linear infinite',
        'hex-float': 'hex-float 4s ease-in-out infinite',
        'data-stream': 'data-stream 3s linear infinite',
        'circuit-pulse': 'circuit-pulse 2s ease-in-out infinite',
        'matrix-rain': 'matrix-rain 4s linear infinite',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        'rotate-slow': 'rotate-slow 20s linear infinite',
        'color-shift': 'color-shift 10s linear infinite',
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
