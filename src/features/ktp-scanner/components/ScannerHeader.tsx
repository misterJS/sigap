type ScannerHeaderProps = {
  userInitials: string;
  userName?: string | null;
  userEmail?: string | null;
  onSignOut?: () => void;
};

export function ScannerHeader({
  userInitials,
  userName,
  userEmail,
  onSignOut,
}: ScannerHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm shadow-slate-200/60"
        aria-label="Buka menu"
      >
        <svg
          className="h-5 w-5 text-slate-600"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M5 7h14M5 12h14M5 17h14" />
        </svg>
      </button>
      <div className="flex items-center gap-3">
        <div className="hidden text-right text-xs sm:flex sm:flex-col">
          <span className="font-semibold text-slate-800">
            {userName || userEmail || "Pengguna"}
          </span>
          {userEmail && (
            <span className="font-medium text-slate-400">{userEmail}</span>
          )}
        </div>
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm shadow-slate-200/60"
          aria-label="Notifikasi"
        >
          <svg
            className="h-5 w-5 text-slate-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M12 5a5 5 0 0 1 5 5v3.5l1.4 2.8A1 1 0 0 1 17.5 17h-11a1 1 0 0 1-.9-1.7L7 13.5V10a5 5 0 0 1 5-5Z" />
            <path d="M9 18a3 3 0 0 0 6 0" strokeLinecap="round" />
          </svg>
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-500" />
        </button>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-sm font-semibold text-white"
          aria-hidden="true"
        >
          {userInitials}
        </div>
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm shadow-slate-200 transition hover:border-slate-300 hover:text-slate-900 active:translate-y-px xl:hidden"
          >
            Keluar
          </button>
        )}
      </div>
    </header>
  );
}
