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
        // 兼容别名：旧 vscode-* 类 → 高对比度莫兰迪色系
        'vscode-bg':             '#F5F3F0',
        'vscode-sidebar':        '#FBFAF9',
        'vscode-active':         '#F0EDE9',
        'vscode-border':         '#D4D0CA',
        'vscode-icon':           '#8F8B86',
        'vscode-icon-hover':     '#5E5B57',
        'vscode-text':           '#1E1C1A',
        'vscode-text-secondary': '#5E5B57',
        'vscode-warning':        '#A8906C',
        'vscode-error':          '#9E6E6E',
        'vscode-success':        '#6B8C73',
        'vscode-info':           '#7B8FA6',
        'vscode-selected':       '#EBF0F5',
        'vscode-panel':          '#FBFAF9',
        'vscode-hover':          '#F0EDE9',
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
