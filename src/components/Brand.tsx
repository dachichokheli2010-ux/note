export default function Brand({ mobile = false }: { mobile?: boolean }) {
  return <div className={`brand${mobile ? ' mobile-brand' : ''}`} aria-label="Notes">
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M27.7 4.3C22.7 2.4 13 6.2 9.8 12.1l-2 8.7 8.7-2C22.4 15.6 26.2 10 27.7 4.3Z" fill="#335CFF" />
      <path d="m4.5 27.5 15-15M8 21l3.5-8M13.5 17l8-3.5" stroke="#335CFF" strokeWidth="2.6" strokeLinecap="round" />
      <path d="m12.7 19.3 7-7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
    <span>Notes</span>
  </div>;
}
