export function LandingFooter() {
  return (
    <footer className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-8 lg:px-10">
      <div className="flex items-center gap-2.5">
        <img src="/favicon.svg" alt="" className="size-5 shrink-0" />

        <span className="text-[13px] text-muted-foreground">Clausio · Contract intelligence</span>
      </div>
      <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
        © {new Date().getFullYear()} Clausio
      </p>
    </footer>
  );
}
