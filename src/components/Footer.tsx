export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-[var(--line)] px-4 pb-14 pt-10 text-[var(--sea-ink-soft)]">
      <div className="page-wrap flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm">&copy; {year} Personal Photo Archive</p>
        <p className="island-kicker m-0">Share link only</p>
      </div>
      <div className="page-wrap mt-4">
        <p className="m-0 text-xs text-[var(--sea-ink-soft)]/90">
          Originals are large files. Open them first before downloading.
        </p>
      </div>
    </footer>
  )
}
