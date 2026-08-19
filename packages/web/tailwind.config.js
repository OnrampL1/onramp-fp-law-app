export default {
  darkMode: ["class"],

  content: ["./index.html", "./src/**/*.{ts,tsx}"],

  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
          active: "var(--sidebar-active)",
          "active-foreground": "var(--sidebar-active-foreground)",
        },
        // Landing-page-only tokens. Values are defined exclusively inside
        // `.landing-scope` (see src/styles/landing.css) -- these utilities
        // resolve to nothing outside that scope, so they cannot leak into
        // or override the authenticated application's palette above.
        "border-strong": "var(--border-strong)",
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
        },
        signal: {
          DEFAULT: "var(--signal)",
          foreground: "var(--signal-foreground)",
        },
        risk: "var(--risk)",
        ok: "var(--ok)",
        paper: {
          DEFAULT: "var(--paper)",
          foreground: "var(--paper-foreground)",
        },
        metal: {
          DEFAULT: "var(--metal)",
          edge: "var(--metal-edge)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },

  plugins: [],
};