export function TipsSection() {
  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white/80 p-5 text-sm text-slate-600 shadow-sm backdrop-blur">
      <h3 className="text-sm font-semibold uppercase tracking-[0.26em] text-slate-400">
        Tips akurasi pemindaian
      </h3>
      <ul className="mt-4 space-y-3 text-sm leading-relaxed">
        <li className="flex gap-3">
          <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
          Gunakan latar belakang polos dan pencahayaan merata tanpa bayangan.
        </li>
        <li className="flex gap-3">
          <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
          Pastikan nomor NIK dan teks penting terlihat tajam serta tidak terpotong.
        </li>
        <li className="flex gap-3">
          <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
          Simpan berkas asli untuk verifikasi manual jika sistem tidak mengenali data dengan tepat.
        </li>
      </ul>
    </section>
  );
}
