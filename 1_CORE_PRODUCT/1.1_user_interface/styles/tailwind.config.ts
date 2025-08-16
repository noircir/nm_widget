/**
 * Tailwind CSS Configuration for NativeMimic v4.0
 * Consistent design system with retro 1980s aesthetic
 */

export default {
  content: [
    './1_CORE_PRODUCT/**/*.{svelte,ts,js,html}',
    './2_PLATFORM_INTEGRATION/**/*.{svelte,ts,js,html}'
  ],
  theme: {
    extend: {
      colors: {
        // NativeMimic brand colors (retro 1980s aesthetic)
        primary: {
          DEFAULT: '#6ab354',    // Main thematic green
          light: '#7bc962',      // Light green for highlights
          dark: '#4a8c3e'        // Dark green for shadows
        },
        // Professional color palette
        professional: {
          slate: '#334155',
          blue: '#3b82f6',
          indigo: '#6366f1'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      boxShadow: {
        'retro-raised': '2px 2px 4px rgba(74, 140, 62, 0.3), inset -1px -1px 2px rgba(74, 140, 62, 0.2)',
        'retro-inset': 'inset 2px 2px 4px rgba(74, 140, 62, 0.3)'
      }
    }
  },
  plugins: []
}