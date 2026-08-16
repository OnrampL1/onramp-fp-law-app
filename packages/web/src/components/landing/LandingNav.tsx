import { Link } from "react-router-dom";

export function LandingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6 lg:px-10">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex size-6 items-center justify-center rounded-[6px] border border-border-strong bg-surface">
            <span className="block size-2 rounded-[2px] bg-foreground" />
          </span>
          <span className="text-[14px] font-medium tracking-[-0.01em]">Clausio</span>
        </a>
        <nav className="hidden items-center gap-7 md:flex">
          {[
            ["Engine", "#intelligence"],
            ["Investigator", "#investigator"],
            ["Control", "#control"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden h-8 items-center rounded-[8px] px-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            to="/login"
            className="inline-flex h-8 items-center rounded-[8px] bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Request access
          </Link>
        </div>
      </div>
    </header>
  );
}
