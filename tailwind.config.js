/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'vscode-bg': '#1e1e1e',
        'vscode-sidebar': '#252526',
        'vscode-active': '#3c3c3c',
        'vscode-border': '#3c3c3c',
        'vscode-icon': '#858585',
        'vscode-icon-hover': '#cccccc',
        'vscode-text': '#d4d4d4',
        'vscode-text-secondary': '#858585',
        'vscode-warning': '#cca700',
        'vscode-error': '#f14c4c',
        'vscode-success': '#6a9955',
        'vscode-info': '#569cd6',
        'vscode-selected': '#094771'
      },
      fontFamily: {
        'mono': ['SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
