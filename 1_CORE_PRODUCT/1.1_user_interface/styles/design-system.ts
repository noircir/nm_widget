/**
 * Design System Constants for NativeMimic v4.0
 * Centralized styling constants and utilities
 */

export const DesignTokens = {
  colors: {
    // Primary brand colors
    primary: '#6ab354',
    primaryLight: '#7bc962',
    primaryDark: '#4a8c3e',
    
    // UI state colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    
    // Neutral colors
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      500: '#6b7280',
      900: '#111827'
    }
  },
  
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem'        // 32px
  },
  
  typography: {
    fontSizes: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem'     // 20px
    },
    fontWeights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  
  shadows: {
    retro: {
      raised: '2px 2px 4px rgba(74, 140, 62, 0.3), inset -1px -1px 2px rgba(74, 140, 62, 0.2)',
      inset: 'inset 2px 2px 4px rgba(74, 140, 62, 0.3)',
      glow: '0 0 8px rgba(106, 179, 84, 0.4)'
    }
  }
};

export const ComponentStyles = {
  button: {
    base: 'px-4 py-2 rounded-md font-medium transition-all duration-200',
    primary: `bg-primary hover:bg-primaryDark text-white shadow-retro-raised`,
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900',
    danger: 'bg-red-500 hover:bg-red-600 text-white'
  },
  
  widget: {
    container: 'bg-white rounded-lg shadow-lg border border-gray-200 p-4',
    overlay: 'fixed z-50 bg-white/95 backdrop-blur-sm border border-primary/20'
  }
};