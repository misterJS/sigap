type PreviewCardProps = {
  previewUrl: string | null;
  fileName: string | null;
};

export function PreviewCard({ previewUrl, fileName }: PreviewCardProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={fileName ?? "Pratinjau foto KTP"}
          className="h-64 w-full object-cover"
        />
      ) : (
        <div className="flex h-64 flex-col items-center justify-center gap-5 px-6 text-center text-slate-400">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-300">
            <svg
              className="h-9 w-9 text-slate-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M8 11h8M8 15h4" />
            </svg>
          </span>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-500">
              Belum ada foto KTP
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              Tekan tombol scan atau upload untuk mulai pemindaian. Pastikan
              foto tajam dan bebas pantulan cahaya.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
