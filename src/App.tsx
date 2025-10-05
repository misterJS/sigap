import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react"

type KtpData = {
  nik: string
  nama: string
  tempatTanggalLahir: string
  alamat: string
  jenisKelamin: string
  pekerjaan: string
  berlakuHingga: string
}

const emptyData: KtpData = {
  nik: "",
  nama: "",
  tempatTanggalLahir: "",
  alamat: "",
  jenisKelamin: "",
  pekerjaan: "",
  berlakuHingga: "",
}

const deriveNikSuffix = (value: string) => {
  if (!value) {
    return "1023"
  }

  let hash = 0
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % 10000
  }

  return hash.toString().padStart(4, "0")
}

const simulateExtraction = (fileName: string): KtpData => {
  const suffix = deriveNikSuffix(fileName)

  return {
    nik: `3201012345${suffix}`,
    nama: "Nama Lengkap Pemilik KTP",
    tempatTanggalLahir: "Semarang, 12 Januari 1994",
    alamat:
      "Jl. Merdeka No. 123, Kel. Citarum, Kec. Semarang Timur, Kota Semarang, Jawa Tengah",
    jenisKelamin: "Laki-laki",
    pekerjaan: "Karyawan Swasta",
    berlakuHingga: "Seumur Hidup",
  }
}

function App() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [ktpData, setKtpData] = useState<KtpData | null>(null)
  const [formData, setFormData] = useState<KtpData>(emptyData)
  const [notes, setNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const processingTimeout = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  useEffect(() => {
    return () => {
      if (processingTimeout.current) {
        window.clearTimeout(processingTimeout.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!ktpData) {
      setFormData(emptyData)
      return
    }

    setFormData(ktpData)
  }, [ktpData])

  useEffect(() => {
    if (!saveFeedback) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setSaveFeedback(null)
    }, 3000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [saveFeedback])

  const openCamera = () => {
    cameraInputRef.current?.click()
  }

  const openFilePicker = () => {
    galleryInputRef.current?.click()
  }

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]

    if (!file) {
      return
    }

    const url = URL.createObjectURL(file)

    setPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current)
      }

      return url
    })

    setFileName(file.name)

    if (processingTimeout.current) {
      window.clearTimeout(processingTimeout.current)
    }

    setIsProcessing(true)

    processingTimeout.current = window.setTimeout(() => {
      const extracted = simulateExtraction(file.name)
      setKtpData(extracted)
      setIsProcessing(false)
      processingTimeout.current = null
    }, 650)

    input.value = ""
  }

  const handleInputChange =
    (field: keyof KtpData) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.currentTarget.value
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }))
    }

  const handleAlamatChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.currentTarget.value
    setFormData((prev) => ({
      ...prev,
      alamat: value,
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setSaveFeedback("Data KTP tersimpan sebagai draft.")
    const now = new Date()
    setLastSavedAt(
      now.toLocaleString("id-ID", {
        day: "2-digit",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }),
    )

    console.table({ ...formData, catatan: notes, sumber: fileName })
  }

  const fieldDefinitions: Array<{
    key: keyof KtpData
    label: string
    placeholder: string
  }> = [
    { key: "nik", label: "NIK", placeholder: "Masukkan 16 digit NIK" },
    { key: "nama", label: "Nama lengkap", placeholder: "Nama sesuai KTP" },
    {
      key: "tempatTanggalLahir",
      label: "Tempat & Tanggal Lahir",
      placeholder: "Contoh: Semarang, 12 Januari 1994",
    },
    { key: "jenisKelamin", label: "Jenis kelamin", placeholder: "Laki-laki / Perempuan" },
    { key: "pekerjaan", label: "Pekerjaan", placeholder: "Pekerjaan saat ini" },
    {
      key: "berlakuHingga",
      label: "Berlaku hingga",
      placeholder: "Seumur Hidup / 12-12-2030",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900">
      <main className="mx-auto flex w-full max-w-xl flex-col px-4 pb-16 pt-12 sm:px-6">
        <header className="text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-300">Sigap ID</p>
          <h1 className="mt-4 text-3xl font-semibold leading-snug sm:text-4xl">
            Pindai KTP dalam hitungan detik
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Gunakan kamera ponsel atau unggah file untuk mengisi formulir secara otomatis dan mempersingkat proses onboarding.
          </p>
        </header>

        <section className="mt-8 space-y-6 rounded-3xl bg-white/95 p-6 shadow-[0_45px_70px_-40px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/40" />
              Siap dipindai
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Ambil foto atau unggah berkas</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Pastikan seluruh data KTP terlihat jelas, tidak blur, dan minim pantulan cahaya.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={openCamera}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition active:translate-y-px"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <path d="M4 9a2 2 0 0 1 2-2h1.3a1 1 0 0 0 .8-.4l.7-.9a1 1 0 0 1 .8-.4h4.8a1 1 0 0 1 .8.4l.7.9a1 1 0 0 0 .8.4H18a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                <circle cx="12" cy="12.5" r="3.5" />
              </svg>
              Ambil foto KTP
            </button>
            <button
              type="button"
              onClick={openFilePicker}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition active:translate-y-px"
            >
              <svg
                className="h-5 w-5 text-slate-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <path d="M4 17V7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8M8 13h8M8 17h5" />
              </svg>
              Unggah dari galeri
            </button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelection}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelection}
          />

          {isProcessing ? (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              Menganalisis detail KTP...
            </div>
          ) : fileName ? (
            <p className="text-xs font-medium text-slate-400">
              Berkas aktif: <span className="text-slate-600">{fileName}</span>
            </p>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={fileName ?? "Pratinjau foto KTP"}
                className="h-64 w-full object-cover"
              />
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-4 px-6 text-center text-slate-400">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-slate-300">
                  <svg
                    className="h-8 w-8 text-slate-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M8 11h8M8 15h4" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-500">
                    Belum ada foto KTP
                  </p>
                  <p className="text-xs leading-relaxed text-slate-400">
                    Tekan tombol kamera untuk membuka kamera belakang, atau unggah file JPG/PNG dengan ukuran maksimal 5 MB.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5 rounded-2xl border border-slate-100 bg-slate-900/5 p-4 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Hasil ekstraksi
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {ktpData ? "Periksa dan koreksi data berikut" : "Data akan muncul setelah foto dianalisis"}
                </p>
              </div>
              <span
                className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                  ktpData ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
                }`}
              >
                {ktpData ? "Terbaca" : "Menunggu"}
              </span>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {fieldDefinitions.map(({ key, label, placeholder }) => (
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
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
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Catatan petugas
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.currentTarget.value)}
                  placeholder="Contoh: Foto KTP perlu pengambilan ulang karena pantulan cahaya."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition active:translate-y-px"
                >
                  Simpan data KTP
                </button>
                {saveFeedback && (
                  <p className="text-center text-xs font-medium text-emerald-600">
                    {saveFeedback}
                  </p>
                )}
                {lastSavedAt && (
                  <p className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    Pembaruan terakhir: {lastSavedAt}
                  </p>
                )}
              </div>
            </form>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-800/40 bg-slate-900/20 p-6 text-sm text-slate-200 backdrop-blur">
          <h3 className="text-sm font-semibold uppercase tracking-[0.26em] text-slate-300">
            Tips akurasi pemindaian
          </h3>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
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
      </main>
    </div>
  )
}

export default App
