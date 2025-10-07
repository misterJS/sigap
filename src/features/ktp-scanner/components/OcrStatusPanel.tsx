type OcrStatusPanelProps = {
  isProcessing: boolean;
  ocrStatus: string | null;
  progressPercent: number;
  fileName: string | null;
  onClearFile: () => void;
  ocrError: string | null;
};

export function OcrStatusPanel({
  isProcessing,
  ocrStatus,
  progressPercent,
  fileName,
  onClearFile,
  ocrError,
}: OcrStatusPanelProps) {
  return (
    <div className="space-y-6">
      {isProcessing ? (
        <div className="flex items-center gap-3 rounded-3xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 shadow-sm">
          <span className="relative inline-flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-300 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-indigo-500" />
          </span>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-700">
              {ocrStatus ?? "Memproses foto KTP..."}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {progressPercent}% selesai
            </span>
          </div>
        </div>
      ) : fileName ? (
        <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-500 shadow-sm">
          <span className="truncate">
            Berkas aktif: <span className="text-slate-700">{fileName}</span>
          </span>
          <button
            type="button"
            onClick={onClearFile}
            className="text-slate-400 transition hover:text-slate-600"
          >
            Bersihkan
          </button>
        </div>
      ) : null}

      {ocrError && (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600 shadow-sm">
          {ocrError}
        </div>
      )}
    </div>
  );
}
