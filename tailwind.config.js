/** @type {import('tailwindcss').Config} */
const ok = (v) => `oklch(var(${v}) / <alpha-value>)`;

// Warm, paper-tinted neutrals. Overriding `slate` re-tones every existing slate-* class at once.
const ink = {
  50: 'oklch(98% 0.006 78 / <alpha-value>)',
  100: 'oklch(95.5% 0.009 76 / <alpha-value>)',
  200: 'oklch(91% 0.012 74 / <alpha-value>)',
  300: 'oklch(84% 0.014 70 / <alpha-value>)',
  400: 'oklch(69% 0.016 64 / <alpha-value>)',
  500: 'oklch(55% 0.018 58 / <alpha-value>)',
  550: 'oklch(50% 0.018 56 / <alpha-value>)',
  600: 'oklch(45% 0.019 54 / <alpha-value>)',
  700: 'oklch(37% 0.02 52 / <alpha-value>)',
  800: 'oklch(29.5% 0.02 50 / <alpha-value>)',
  850: 'oklch(25% 0.02 50 / <alpha-value>)',
  900: 'oklch(21% 0.018 50 / <alpha-value>)',
  950: 'oklch(15% 0.014 50 / <alpha-value>)',
};

module.exports = {
  darkMode: ["class"],
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'var(--font-deva)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-display)', 'var(--font-deva)', 'Georgia', 'serif'],
      },
      colors: {
        white: 'oklch(99.2% 0.005 82 / <alpha-value>)',
        slate: ink,
        canvas: ok('--paper'),
        paper: { DEFAULT: ok('--paper'), deep: ok('--paper-deep') },
        surface: ok('--surface'),
        clay: { DEFAULT: ok('--clay'), deep: ok('--clay-deep') },
        leaf: ok('--leaf'),
        turmeric: ok('--turmeric'),
        night: { DEFAULT: ok('--night'), soft: ok('--night-soft') },

        border: ok('--border'),
        input: ok('--input'),
        ring: ok('--ring'),
        background: ok('--background'),
        foreground: ok('--foreground'),
        primary: { DEFAULT: ok('--primary'), foreground: ok('--primary-foreground') },
        secondary: { DEFAULT: ok('--secondary'), foreground: ok('--secondary-foreground') },
        destructive: { DEFAULT: ok('--destructive'), foreground: ok('--destructive-foreground') },
        muted: { DEFAULT: ok('--muted'), foreground: ok('--muted-foreground') },
        accent: { DEFAULT: ok('--accent'), foreground: ok('--accent-foreground') },
        popover: { DEFAULT: ok('--popover'), foreground: ok('--popover-foreground') },
        card: { DEFAULT: ok('--card'), foreground: ok('--card-foreground') },
        sidebar: {
          DEFAULT: ok('--sidebar-background'),
          foreground: ok('--sidebar-foreground'),
          primary: ok('--sidebar-primary'),
          'primary-foreground': ok('--sidebar-primary-foreground'),
          accent: ok('--sidebar-accent'),
          'accent-foreground': ok('--sidebar-accent-foreground'),
          border: ok('--sidebar-border'),
          ring: ok('--sidebar-ring'),
        },
      },
      borderRadius: {
        '3xl': '1.75rem',
        '4xl': '2rem',
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: '0 1px 2px 0 oklch(30% 0.03 50 / 0.06)',
        // Paper resting on paper: tight contact shadow + soft ambient, warm-tinted.
        paper: '0 1px 1px oklch(30% 0.03 50 / 0.06), 0 8px 24px -8px oklch(30% 0.04 50 / 0.14)',
        lift: '0 2px 2px oklch(30% 0.03 50 / 0.06), 0 20px 40px -16px oklch(30% 0.05 45 / 0.22)',
      },
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "caret-blink": { "0%,70%,100%": { opacity: "1" }, "20%,50%": { opacity: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
