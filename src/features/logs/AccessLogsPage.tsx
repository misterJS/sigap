import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import type { GateStatus } from "../ktp-scanner/components/GateStatusToggle";
import { useDebouncedValue } from "../../hooks/useDebounceValue";

type LogEntry = {
  id: string;
  created_at: string;
  updated_at: string;
  nama: string;
  nik: string;
  gate_status: string | null;
  operator_notes: string | null;
  created_by: string | null;
  created_by_email: string | null;
  created_by_name: string | null;
};

type FilterState = {
  startDate: string;
  endDate: string;
  operatorKey: string;
  query: string;
};

const initialFilters: FilterState = {
  startDate: "",
  endDate: "",
  operatorKey: "all",
  query: "",
};

const STATUS_OPTIONS: ReadonlyArray<{ value: GateStatus; label: string }> = [
  { value: "masuk", label: "Masuk perumahan" },
  { value: "keluar", label: "Keluar perumahan" },
  { value: "stay", label: "Tinggal sementara" },
];

export function AccessLogsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<LogEntry | null>(null);
  const [editedNotes, setEditedNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 100;
  const [hasMore, setHasMore] = useState(true);

  // Debounce filter yang sering berubah
  const debouncedQuery = useDebouncedValue(filters.query, 450);
  const debouncedOperatorKey = useDebouncedValue(filters.operatorKey, 250);

  // Abort in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  // (Opsional) Cache sederhana berdasarkan key filter + page
  // const cacheRef = useRef(new Map<string, LogEntry[]>());

  const uniqueOperators = useMemo(() => {
    const seen = new Set<string>();
    const items: Array<{ value: string; label: string }> = [];
    for (const entry of logs) {
      const isIdAvailable = Boolean(entry.created_by);
      const key = isIdAvailable
        ? `id:${entry.created_by as string}`
        : entry.created_by_email
        ? `email:${entry.created_by_email}`
        : "";
      if (!key || seen.has(key)) continue;
      seen.add(key);
      items.push({
        value: key,
        label: entry.created_by_name || entry.created_by_email || "Tanpa nama",
      });
    }
    return items;
  }, [logs]);

  // Reset halaman saat filter berubah
  useEffect(() => {
    setPage(0);
    setHasMore(true);
  }, [
    filters.startDate,
    filters.endDate,
    debouncedOperatorKey,
    debouncedQuery,
  ]);

  // Loader utama (dipanggil setiap page / filter berubah)
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLogs([]);
      return;
    }

    // Batalkan request sebelumnya
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    let isActive = true;

    const loadLogs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("ktp_submissions")
          .select(
            "id, created_at, updated_at, nama, nik, gate_status, operator_notes, created_by, created_by_email, created_by_name",
            { count: "exact", head: false }
          )
          .order("created_at", { ascending: false });

        // Range pagination
        const from = page * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        // Filter tanggal
        if (filters.startDate) {
          const start = new Date(filters.startDate + "T00:00:00");
          query = query.gte("created_at", start.toISOString());
        }
        if (filters.endDate) {
          const end = new Date(filters.endDate + "T00:00:00");
          end.setDate(end.getDate() + 1);
          query = query.lt("created_at", end.toISOString());
        }

        // Filter operator
        if (debouncedOperatorKey !== "all") {
          const [column, value] = debouncedOperatorKey.split(":");
          if (column === "id") query = query.eq("created_by", value);
          else if (column === "email")
            query = query.eq("created_by_email", value);
        }

        // Filter keyword nama (debounced)
        if (debouncedQuery.trim()) {
          query = query.ilike("nama", `%${debouncedQuery.trim()}%`);
        }

        // // (Opsional) Cache
        // const cacheKey = JSON.stringify({
        //   s: filters.startDate,
        //   e: filters.endDate,
        //   ok: debouncedOperatorKey,
        //   q: debouncedQuery,
        //   p: page,
        // });
        // if (cacheRef.current.has(cacheKey)) {
        //   if (!isActive) return;
        //   const cached = cacheRef.current.get(cacheKey)!;
        //   setLogs((prev) => (page === 0 ? cached : prev));
        //   setIsLoading(false);
        //   setHasMore(cached.length === pageSize);
        //   return;
        // }

        const { data, error: supabaseError } = await query.abortSignal(
          abortRef.current!.signal
        );

        if (supabaseError) throw new Error(supabaseError.message);

        if (!isActive) return;

        // Page 0: replace; page > 0: append
        setLogs((prev) =>
          page === 0 ? data ?? [] : [...prev, ...(data ?? [])]
        );
        setHasMore((data?.length ?? 0) === pageSize);

        // // cache
        // cacheRef.current.set(cacheKey, data ?? []);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error("Gagal memuat log gerbang:", e);
        if (isActive)
          setError(e?.message || "Terjadi kesalahan saat memuat data log.");
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void loadLogs();

    return () => {
      isActive = false;
      abortRef.current?.abort();
    };
  }, [
    isSupabaseConfigured,
    filters.startDate,
    filters.endDate,
    debouncedOperatorKey,
    debouncedQuery,
    page,
  ]);

  const updateFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => {
        if (prev[key] === value) return prev;
        return { ...prev, [key]: value };
      });
    },
    []
  );

  const handleStatusUpdate = useCallback(
    async (entry: LogEntry, nextStatus: GateStatus) => {
      if (!isSupabaseConfigured) {
        setMutationError(
          "Supabase belum dikonfigurasi. Tambahkan kredensial di .env untuk memperbarui status."
        );
        return;
      }
      if (entry.gate_status === nextStatus) return;

      setUpdatingId(entry.id);
      setMutationError(null);
      setUpdateMessage(null);

      try {
        const { error: updateError } = await supabase
          .from("ktp_submissions")
          .update({ gate_status: nextStatus })
          .eq("id", entry.id);

        if (updateError) throw new Error(updateError.message);

        const nowIso = new Date().toISOString();
        setLogs((prev) =>
          prev.map((item) =>
            item.id === entry.id
              ? { ...item, gate_status: nextStatus, updated_at: nowIso }
              : item
          )
        );
        setUpdateMessage("Status gerbang berhasil diperbarui.");
      } catch (updateErr: any) {
        console.error("Gagal memperbarui status gerbang:", updateErr);
        setMutationError(
          updateErr?.message || "Tidak dapat memperbarui status gerbang."
        );
      } finally {
        setUpdatingId(null);
      }
    },
    [isSupabaseConfigured]
  );

  const openNotesEditor = useCallback((entry: LogEntry) => {
    setEditingEntry(entry);
    setEditedNotes(entry.operator_notes ?? "");
    setMutationError(null);
    setUpdateMessage(null);
  }, []);

  const closeNotesEditor = useCallback(() => {
    setEditingEntry(null);
    setEditedNotes("");
  }, []);

  const handleNotesSave = useCallback(async () => {
    if (!editingEntry) return;

    if (!isSupabaseConfigured) {
      setMutationError(
        "Supabase belum dikonfigurasi. Tambahkan kredensial di .env untuk memperbarui catatan."
      );
      return;
    }

    setIsSavingNotes(true);
    setMutationError(null);

    const preparedNotes = editedNotes.trim();
    const payloadNotes = preparedNotes.length > 0 ? preparedNotes : null;

    try {
      const { error: updateError } = await supabase
        .from("ktp_submissions")
        .update({ operator_notes: payloadNotes })
        .eq("id", editingEntry.id);

      if (updateError) throw new Error(updateError.message);

      const nowIso = new Date().toISOString();
      setLogs((prev) =>
        prev.map((item) =>
          item.id === editingEntry.id
            ? { ...item, operator_notes: payloadNotes, updated_at: nowIso }
            : item
        )
      );

      setUpdateMessage("Catatan petugas berhasil diperbarui.");
      closeNotesEditor();
    } catch (err: any) {
      console.error("Gagal memperbarui catatan:", err);
      setMutationError(err?.message || "Tidak dapat memperbarui catatan.");
    } finally {
      setIsSavingNotes(false);
    }
  }, [closeNotesEditor, editedNotes, editingEntry, isSupabaseConfigured]);

  useEffect(() => {
    if (!updateMessage) return;
    const timeoutId = window.setTimeout(() => setUpdateMessage(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [updateMessage]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-16 pt-8 text-slate-900 lg:px-12">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Log Gerbang
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Riwayat keluar-masuk pengunjung
        </h1>
        <p className="text-sm text-slate-500">
          Lihat catatan penjagaan berdasarkan petugas yang melakukan input.
          Gunakan filter untuk memeriksa rentang tanggal atau operator tertentu.
        </p>
      </header>

      {!isSupabaseConfigured && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 shadow-sm shadow-amber-200/60">
          Supabase belum dikonfigurasi sehingga data log tidak dapat dimuat.
        </div>
      )}

      {isSupabaseConfigured && (
        <>
          <section className="mt-8 grid gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm shadow-slate-200/70 backdrop-blur md:grid-cols-4 md:gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Cari tamu
              </label>
              <input
                type="search"
                placeholder="Masukkan nama tamu"
                value={filters.query}
                onChange={(e) =>
                  updateFilter("query", e.currentTarget.value ?? "")
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Dari tanggal
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  updateFilter("startDate", e.currentTarget.value ?? "")
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Sampai tanggal
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) =>
                  updateFilter("endDate", e.currentTarget.value ?? "")
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Petugas
              </label>
              <select
                value={filters.operatorKey}
                onChange={(e) =>
                  updateFilter("operatorKey", e.currentTarget.value ?? "all")
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                <option value="all">Semua petugas</option>
                {uniqueOperators.map((operator) => (
                  <option key={operator.value} value={operator.value}>
                    {operator.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-lg shadow-slate-900/10 backdrop-blur">
            {updateMessage && (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {updateMessage}
              </div>
            )}
            {mutationError && (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
                {mutationError}
              </div>
            )}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm font-medium text-slate-500">
                  Memuat data log...
                </div>
              </div>
            )}

            {!isLoading && error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">
                {error}
              </div>
            )}

            {!isLoading && !error && logs.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <svg
                  className="h-10 w-10 text-slate-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M3 10h18" />
                </svg>
                <p className="text-sm font-semibold text-slate-600">
                  Belum ada catatan yang sesuai filter.
                </p>
                <p className="text-xs font-medium text-slate-400">
                  Ubah rentang tanggal atau pilih petugas lain.
                </p>
              </div>
            )}

            {!isLoading && !error && logs.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        <th className="px-3 py-3">Status Gerbang</th>
                        <th className="px-3 py-3">Nama</th>
                        <th className="px-3 py-3">Masuk</th>
                        <th className="px-3 py-3">Keluar</th>
                        <th className="px-3 py-3">NIK</th>
                        <th className="px-3 py-3">Petugas</th>
                        <th className="px-3 py-3">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {logs.map((entry) => {
                        const masukDate = new Date(entry.created_at);
                        const masukText = Number.isNaN(masukDate.getTime())
                          ? "—"
                          : format(masukDate, "dd MMM yyyy HH:mm", {
                              locale: idLocale,
                            });

                        let keluarText = "—";
                        if (
                          entry.gate_status === "keluar" &&
                          entry.updated_at
                        ) {
                          const keluarDate = new Date(entry.updated_at);
                          if (!Number.isNaN(keluarDate.getTime())) {
                            keluarText = format(
                              keluarDate,
                              "dd MMM yyyy HH:mm",
                              { locale: idLocale }
                            );
                          }
                        }

                        const operatorLabel =
                          entry.created_by_name ||
                          entry.created_by_email ||
                          "Tidak diketahui";
                        const gateStatusLabel =
                          entry.gate_status === "keluar"
                            ? "Keluar"
                            : entry.gate_status === "masuk"
                            ? "Masuk"
                            : entry.gate_status === "stay"
                            ? "Tinggal sementara"
                            : "Belum ditetapkan";

                        return (
                          <tr key={entry.id} className="align-top">
                            <td className="px-3 py-4">
                              <div className="flex flex-col gap-2">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                    entry.gate_status === "masuk"
                                      ? "bg-emerald-100 text-emerald-600"
                                      : entry.gate_status === "keluar"
                                      ? "bg-sky-100 text-sky-600"
                                      : entry.gate_status === "stay"
                                      ? "bg-amber-100 text-amber-600"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {gateStatusLabel}
                                </span>
                                <select
                                  value={entry.gate_status ?? ""}
                                  onChange={(e) => {
                                    const nextValue = e.currentTarget.value as
                                      | GateStatus
                                      | "";
                                    if (!nextValue) return;
                                    void handleStatusUpdate(
                                      entry,
                                      nextValue as GateStatus
                                    );
                                  }}
                                  disabled={updatingId === entry.id}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {!entry.gate_status && (
                                    <option value="">Pilih status</option>
                                  )}
                                  {STATUS_OPTIONS.map((option) => (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              <p className="font-semibold text-slate-800">
                                {entry.nama || "-"}
                              </p>
                            </td>
                            <td className="px-3 py-4 font-semibold text-slate-700">
                              {masukText}
                            </td>
                            <td className="px-3 py-4 font-semibold text-slate-600">
                              {keluarText}
                            </td>

                            <td className="px-3 py-4 font-mono text-xs font-medium text-slate-500">
                              {entry.nik || "-"}
                            </td>

                            <td className="px-3 py-4">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-slate-700">
                                  {operatorLabel}
                                </p>
                                {entry.created_by_email && (
                                  <p className="text-xs font-medium text-slate-400">
                                    {entry.created_by_email}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-4 text-xs text-slate-500">
                              <p className="whitespace-pre-wrap font-medium text-slate-600">
                                {entry.operator_notes &&
                                entry.operator_notes.trim().length > 0
                                  ? entry.operator_notes
                                  : "—"}
                              </p>
                              <button
                                type="button"
                                onClick={() => openNotesEditor(entry)}
                                className="mt-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm shadow-slate-200 transition hover:border-slate-300 hover:text-slate-900 active:translate-y-px"
                              >
                                Edit catatan
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {hasMore && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.99]"
                      disabled={isLoading}
                    >
                      Muat lebih banyak
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}

      {editingEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4"
          onClick={closeNotesEditor}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl shadow-slate-900/30"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Edit catatan petugas
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingEntry.nama || "Tamu"}
                </h2>
                <p className="text-xs font-medium text-slate-400">
                  NIK: {editingEntry.nik || "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeNotesEditor}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-900"
                aria-label="Tutup"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            </div>

            <form
              className="mt-4 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleNotesSave();
              }}
            >
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Catatan petugas
                </label>
                <textarea
                  rows={6}
                  value={editedNotes}
                  onChange={(event) =>
                    setEditedNotes(event.currentTarget.value)
                  }
                  placeholder="Tambahkan catatan penting terkait kunjungan ini."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeNotesEditor}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm shadow-slate-200 transition hover:border-slate-300 hover:text-slate-900 active:translate-y-px"
                  disabled={isSavingNotes}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSavingNotes}
                >
                  {isSavingNotes ? "Menyimpan..." : "Simpan catatan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
