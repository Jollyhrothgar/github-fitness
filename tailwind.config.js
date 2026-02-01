/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme optimized for gym use (high contrast, easy on eyes)
        background: '#0f172a',
        surface: '#1e293b',
        'surface-elevated': '#334155',
        primary: '#3b82f6',
        'primary-hover': '#2563eb',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        'text-primary': '#f8fafc',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
        border: '#334155',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
