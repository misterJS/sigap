import type { SecondaryAction } from "../types";

type WelcomeSectionProps = {
  onPrimaryAction: () => void;
  secondaryActions: SecondaryAction[];
};

export function WelcomeSection({
  onPrimaryAction,
  secondaryActions,
}: WelcomeSectionProps) {
  return (
    <section className="mt-9 space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-400">Hi, Pak security</p>
        <h1 className="text-3xl font-semibold leading-tight">
          Siap berjaga hari ini?
        </h1>
        <p className="text-sm text-slate-500">
          Ambil foto KTP dan sistem akan membaca otomatis.
        </p>
      </div>

      <button
        type="button"
        onClick={onPrimaryAction}
        className="group flex w-full flex-col items-center justify-center gap-4 rounded-3xl bg-gradient-to-b from-[#e7efff] to-[#f1f6ff] p-6 text-slate-700 shadow-[0_25px_45px_-30px_rgba(37,99,235,0.45)] transition active:scale-[0.99]"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-500 shadow-sm shadow-indigo-200/60">
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M4 9a2 2 0 0 1 2-2h1.3a1 1 0 0 0 .8-.4l.7-.9a1 1 0 0 1 .8-.4h4.8a1 1 0 0 1 .8.4l.7.9a1 1 0 0 0 .8.4H18a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
            <circle cx="12" cy="12.5" r="3.5" />
          </svg>
        </span>
        <div className="text-center">
          <p className="text-base font-semibold text-slate-700">
            Scan sekarang
          </p>
          <p className="text-xs font-medium text-slate-400">
            Gunakan kamera belakang untuk hasil terbaik
          </p>
        </div>
      </button>

      <div className="grid grid-cols-3 gap-3">
        {secondaryActions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={action.onClick}
            className={`flex flex-col items-start gap-3 rounded-2xl bg-gradient-to-b ${action.gradient} p-4 text-left shadow-sm shadow-slate-200/40 transition active:scale-95`}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm shadow-slate-200/60">
              {action.icon}
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700">
                {action.label}
              </p>
              <p className="text-xs font-medium text-slate-400">
                {action.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-full border border-slate-200/80 bg-white/80 p-1 shadow-sm shadow-slate-200/40 backdrop-blur">
        <div className="flex items-center gap-3 rounded-full px-4 py-2">
          <svg
            className="h-5 w-5 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="6" />
            <path d="m17 17 3 3" />
          </svg>
          <input
            type="search"
            placeholder="Cari atau tulis instruksi"
            className="flex-1 border-none bg-transparent text-sm font-medium text-slate-500 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white shadow"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
