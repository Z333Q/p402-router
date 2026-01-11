import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['var(--font-ui)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
            },
            colors: {
                // V2 Theme Mappings
                primary: 'var(--primary)',
                'primary-hover': 'var(--primary-hover)',

                // Neutral Scale (Dark Mode Default)
                'neutral-900': 'var(--neutral-900)', // Black
                'neutral-800': 'var(--neutral-800)', // Dark Surface
                'neutral-700': 'var(--neutral-700)',
                'neutral-400': 'var(--neutral-400)',
                'neutral-300': 'var(--neutral-300)',
                'neutral-50': 'var(--neutral-50)',   // White

                // Semantics
                success: 'var(--success)',
                error: 'var(--error)',
                warn: 'var(--warning)',
                info: 'var(--info)',
                cache: 'var(--cache)',
            },
            borderWidth: {
                DEFAULT: '1px',
            },
        },
    },
    plugins: [],
};
export default config;
