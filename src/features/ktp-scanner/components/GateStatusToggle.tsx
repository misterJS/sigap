type GateStatus = "masuk" | "stay" | "keluar";

type GateStatusToggleProps = {
  value: GateStatus;
  onChange: (value: GateStatus) => void;
};

const OPTIONS: Array<{ value: GateStatus; label: string; description: string }> = [
  { value: "masuk", label: "Masuk Perumahan", description: "Penghuni atau tamu baru tiba" },
  { value: "stay", label: "Tinggal Sementara", description: "Penghuni sementara" },
];

export function GateStatusToggle({ value, onChange }: GateStatusToggleProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Status Gerbang
      </p>
      <div className="mt-3 grid gap-2">
        {OPTIONS.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition ${
                isActive
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm"
                  : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white"
              }`}
            >
              <span className="text-sm font-semibold">{option.label}</span>
              <span className="text-xs text-slate-400">{option.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { GateStatus };
