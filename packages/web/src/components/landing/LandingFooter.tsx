export function LandingFooter() {
  return (
    <footer className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-8 lg:px-10">
      <div className="flex items-center gap-2.5">
        <span className="flex size-5 items-center justify-center rounded-[5px] border border-border-strong bg-surface">
          <span className="block size-1.5 rounded-[2px] bg-foreground" />
        </span>
        <span className="text-[13px] text-muted-foreground">Clausio · Contract intelligence</span>
      </div>
      <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
        © {new Date().getFullYear()} Clausio
      </p>
    </footer>
  );
}
