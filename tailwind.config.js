/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary:  {
          DEFAULT: '#7B8FA6',
          light:   '#A3B5C4',
          dark:    '#5C7088',
          subtle:  '#EBF0F5',
        },
        cta: {
          DEFAULT: '#A8906C',
          dark:    '#8C7458',
          subtle:  '#F5EFE8',
        },
        surface: {
          DEFAULT: '#FBFAF9',
          hover:   '#F0EDE9',
          raised:  '#FFFFFF',
        },
        morandi: {
          bg:      '#F5F3F0',
          border:  '#D4D0CA',
          divider: '#E8E5E1',
          text1:   '#1E1C1A',
          text2:   '#5E5B57',
          text3:   '#8F8B86',
        },
        success: {
          DEFAULT: '#6B8C73',
          subtle:  '#EDF4EF',
        },
        warning: {
          DEFAULT: '#A8906C',
          subtle:  '#F7F1E4',
        },
        danger: {
          DEFAULT: '#9E6E6E',
          subtle:  '#F5EDEC',
        },
        // 兼容别名：旧 vscode-* 类 → 高对比度莫兰迪色系（通过CSS变量支持暗色模式）
        'vscode-bg':             'rgb(var(--color-bg-rgb) / <alpha-value>)',
        'vscode-sidebar':        'rgb(var(--color-surface-rgb) / <alpha-value>)',
        'vscode-active':         'rgb(var(--color-surface-hover-rgb) / <alpha-value>)',
        'vscode-border':         'rgb(var(--color-border-rgb) / <alpha-value>)',
        'vscode-icon':           'rgb(var(--color-text-tertiary-rgb) / <alpha-value>)',
        'vscode-icon-hover':     'rgb(var(--color-text-primary-rgb) / <alpha-value>)',
        'vscode-text':           'rgb(var(--color-text-primary-rgb) / <alpha-value>)',
        'vscode-text-secondary': 'rgb(var(--color-text-secondary-rgb) / <alpha-value>)',
        'vscode-warning':        'rgb(var(--color-warning-rgb) / <alpha-value>)',
        'vscode-error':          'rgb(var(--color-danger-rgb) / <alpha-value>)',
        'vscode-success':        'rgb(var(--color-success-rgb) / <alpha-value>)',
        'vscode-info':           'rgb(var(--color-primary-rgb) / <alpha-value>)',
        'vscode-selected':       'rgb(var(--color-primary-subtle-rgb) / <alpha-value>)',
        'vscode-panel':          'rgb(var(--color-surface-rgb) / <alpha-value>)',
        'vscode-hover':          'rgb(var(--color-surface-hover-rgb) / <alpha-value>)',
        'vscode-input':          'rgb(var(--color-surface-raised-rgb) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'PingFang SC', 'sans-serif'],
        body:    ['Inter', 'PingFang SC', 'sans-serif'],
        mono:    ['SF Mono', 'JetBrains Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        'glass':       '0 4px 20px rgba(30, 28, 26, 0.05)',
        'glass-dark':  '0 4px 20px rgba(0, 0, 0, 0.18)',
        'glass-float': '0 8px 32px rgba(30, 28, 26, 0.08)',
      },
    },
  },
  plugins: [],
}