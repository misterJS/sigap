import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale/id";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

type LogEntry = {
  id: string;
  created_at: string;
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
};

const initialFilters: FilterState = {
  startDate: "",
  endDate: "",
  operatorKey: "all",
};

export function AccessLogsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLogs([]);
      return;
    }

    let isActive = true;
    const loadLogs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("ktp_submissions")
          .select(
            "id, created_at, nama, nik, gate_status, operator_notes, created_by, created_by_email, created_by_name"
          )
          .order("created_at", { ascending: false })
          .limit(500);

        if (filters.startDate) {
          const start = new Date(filters.startDate);
          query = query.gte("created_at", start.toISOString());
        }

        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setDate(end.getDate() + 1);
          query = query.lt("created_at", end.toISOString());
        }

        if (filters.operatorKey !== "all") {
          const [column, value] = filters.operatorKey.split(":");
          if (column === "id") {
            query = query.eq("created_by", value);
          } else if (column === "email") {
            query = query.eq("created_by_email", value);
          }
        }

        const { data, error: supabaseError } = await query;

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        if (isActive) {
          setLogs(data ?? []);
        }
      } catch (fetchError: any) {
        console.error("Gagal memuat log gerbang:", fetchError);
        if (isActive) {
          setError(fetchError?.message || "Terjadi kesalahan saat memuat data log.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadLogs();

    return () => {
      isActive = false;
    };
  }, [filters, isSupabaseConfigured]);

  const handleFilterChange =
    (field: "startDate" | "endDate") => (event: ChangeEvent<HTMLInputElement>) =>
      setFilters((prev) => ({ ...prev, [field]: event.currentTarget.value }));

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
          Lihat catatan penjagaan berdasarkan petugas yang melakukan input. Gunakan filter untuk
          memeriksa rentang tanggal atau operator tertentu.
        </p>
      </header>

      {!isSupabaseConfigured && (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 shadow-sm shadow-amber-200/60">
          Supabase belum dikonfigurasi sehingga data log tidak dapat dimuat.
        </div>
      )}

      {isSupabaseConfigured && (
        <>
          <section className="mt-8 grid gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm shadow-slate-200/70 backdrop-blur md:grid-cols-3 md:gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Dari tanggal
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={handleFilterChange("startDate")}
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
                onChange={handleFilterChange("endDate")}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Petugas
              </label>
              <select
                value={filters.operatorKey}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, operatorKey: event.currentTarget.value }))
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
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm font-medium text-slate-500">Memuat data log...</div>
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
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      <th className="px-3 py-3">Waktu</th>
                      <th className="px-3 py-3">Nama</th>
                      <th className="px-3 py-3">NIK</th>
                      <th className="px-3 py-3">Status Gerbang</th>
                      <th className="px-3 py-3">Petugas</th>
                      <th className="px-3 py-3">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {logs.map((entry) => {
                      const formattedDate = format(new Date(entry.created_at), "dd MMM yyyy HH:mm", {
                        locale: idLocale,
                      });
                      const operatorLabel = entry.created_by_name || entry.created_by_email || "Tidak diketahui";
                      const gateStatus =
                        entry.gate_status === "keluar"
                          ? "Keluar"
                          : entry.gate_status === "masuk"
                          ? "Masuk"
                          : "Tidak ada";
                      return (
                        <tr key={entry.id} className="align-top">
                          <td className="px-3 py-4 font-semibold text-slate-700">{formattedDate}</td>
                          <td className="px-3 py-4">
                            <p className="font-semibold text-slate-800">{entry.nama || "-"}</p>
                          </td>
                          <td className="px-3 py-4 font-mono text-xs font-medium text-slate-500">
                            {entry.nik || "-"}
                          </td>
                          <td className="px-3 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                gateStatus === "Masuk"
                                  ? "bg-emerald-100 text-emerald-600"
                                  : gateStatus === "Keluar"
                                  ? "bg-sky-100 text-sky-600"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {gateStatus}
                            </span>
                          </td>
                          <td className="px-3 py-4">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-slate-700">{operatorLabel}</p>
                              {entry.created_by_email && (
                                <p className="text-xs font-medium text-slate-400">{entry.created_by_email}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-4 text-xs font-medium text-slate-500">
                            {entry.operator_notes || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
