import type { FormEvent, ChangeEvent } from "react";
import type { KtpData, KtpFormField } from "../types";
import { GateStatusToggle, type GateStatus } from "./GateStatusToggle";

type OcrResultFormProps = {
  ktpData: KtpData | null;
  formData: KtpData;
  rawOcrText: string;
  ocrLanguage: string | null;
  notes: string;
  isSaving: boolean;
  saveFeedback: string | null;
  lastSavedAt: string | null;
  isSupabaseConfigured: boolean;
  fields: KtpFormField[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: (field: keyof KtpData, value: string) => void;
  onAlamatChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  gateStatus: GateStatus;
  onGateStatusChange: (value: GateStatus) => void;
};

export function OcrResultForm({
  ktpData,
  formData,
  rawOcrText,
  ocrLanguage,
  notes,
  isSaving,
  saveFeedback,
  lastSavedAt,
  isSupabaseConfigured,
  fields,
  onSubmit,
  onFieldChange,
  onAlamatChange,
  onNotesChange,
  gateStatus,
  onGateStatusChange,
}: OcrResultFormProps) {
  const handleInputChange =
    (field: keyof KtpData) => (event: ChangeEvent<HTMLInputElement>) =>
      onFieldChange(field, event.currentTarget.value);

  const handleAlamatChange =
    (event: ChangeEvent<HTMLTextAreaElement>) => onAlamatChange(event.currentTarget.value);

  const saveFeedbackClass = (() => {
    if (!saveFeedback) return "";
    if (saveFeedback.startsWith("�o.")) return "text-emerald-600";
    if (saveFeedback.startsWith("�s��,?")) return "text-amber-600";
    return "text-rose-600";
  })();

  return (
    <div className="space-y-5 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Hasil ekstraksi
          </p>
          <p className="text-sm font-semibold text-slate-800">
            {ktpData
              ? "Periksa dan koreksi data berikut"
              : "Data akan muncul setelah foto dianalisis"}
          </p>
        </div>
        <span
          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
            ktpData ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
          }`}
        >
          {ktpData
            ? `Terbaca${ocrLanguage ? ` A� ${ocrLanguage.toUpperCase()}` : ""}`
            : "Menunggu"}
        </span>
      </div>

      {rawOcrText && (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Hasil OCR mentah
            </p>
            {ocrLanguage && (
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {ocrLanguage.toUpperCase()}
              </span>
            )}
          </div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs leading-relaxed text-slate-600">
            {rawOcrText}
          </pre>
        </div>
      )}

      <form className="space-y-4" onSubmit={onSubmit}>
        {fields.map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </label>
            <input
              type="text"
              inputMode={key === "nik" ? "numeric" : undefined}
              pattern={key === "nik" ? "[0-9]*" : undefined}
              value={formData[key]}
              onChange={handleInputChange(key)}
              placeholder={placeholder}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        ))}

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Alamat
          </label>
          <textarea
            rows={3}
            value={formData.alamat}
            onChange={handleAlamatChange}
            placeholder="Alamat lengkap sesuai KTP"
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Catatan petugas
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(event) => onNotesChange(event.currentTarget.value)}
            placeholder="Contoh: Foto KTP perlu pengambilan ulang karena pantulan cahaya."
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        <GateStatusToggle value={gateStatus} onChange={onGateStatusChange} />

        <div className="space-y-3 pt-1">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Menyimpan..." : "Simpan data KTP"}
          </button>
          {saveFeedback && (
            <p className={`text-center text-xs font-medium ${saveFeedbackClass}`}>
              {saveFeedback}
            </p>
          )}
          {lastSavedAt && (
            <p className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Pembaruan terakhir: {lastSavedAt}
            </p>
          )}
          {!isSupabaseConfigured && (
            <p className="text-center text-xs text-rose-500">
              *Supabase belum dikonfigurasi, data hanya tersimpan ke console.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
