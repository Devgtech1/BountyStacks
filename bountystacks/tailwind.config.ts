import type { Config } from 'tailwindcss';
const config: Config = { darkMode: ['class'], content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'], theme: { extend: { colors: { ink: '#0b0d10', panel: '#171a20', line: '#272c35', accent: '#16c784', 'accent-dark': '#087f55' }, boxShadow: { soft: '0 12px 40px rgba(0,0,0,.08)' } } }, plugins: [] };
export default config;
