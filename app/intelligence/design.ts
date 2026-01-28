import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';

export const fontSans = IBM_Plex_Sans({
    subsets: ['latin'],
    variable: '--font-sans',
    weight: ['400', '500', '700'],
    display: 'swap',
});

export const fontMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
    weight: ['400', '700'],
    display: 'swap',
});

// Common design tokens for the Intelligence section
export const DESIGN = {
    colors: {
        primary: '#B6FF2E', // Lime
        dark: '#141414',    // Almost black
        light: '#F5F5F5',   // Off-white
        link: '#22D3EE',    // Cyan
        border: '#000000',  // Pure black
    },
    borders: {
        thick: '2px solid #000000',
        thin: '1px solid #000000',
    },
    spacing: {
        section: '48px',
        gap: '24px',
    }
};
