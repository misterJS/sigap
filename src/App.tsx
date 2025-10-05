import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useRef, useState } from "react"
import type { LoggerMessage, Worker as TesseractWorker } from "tesseract.js"

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

const statusMessages: Record<string, string> = {
  "initializing tesseract": "Menyiapkan mesin OCR...",
  "loading tesseract core": "Mengunduh inti mesin OCR...",
  "loaded tesseract core": "Mesin OCR siap digunakan",
  "initializing api": "Menginisialisikan modul OCR...",
  "loading language traineddata": "Mengunduh model bahasa...",
  "loaded language traineddata": "Model bahasa siap...",
  "recognizing text": "Mengenali teks pada KTP...",
}

const cleanValue = (value: string) => value.replace(/\s+/g, " ").replace(/^[,.;:|\-]+/, "").trim()

const parseKtpData = (rawText: string): KtpData => {
  const sanitized = rawText.replace(/\r/g, "")
  const lines = sanitized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
  const lowerLines = lines.map((line) => line.toLowerCase())

  const getIndex = (keywords: string[]) =>
    lowerLines.findIndex((line) => keywords.every((keyword) => line.includes(keyword)))

  const valueFromIndex = (index: number): string => {
    if (index === -1) {
      return ""
    }

    const current = lines[index]
    const splitted = current.split(/[:]/)
    if (splitted.length > 1) {
      const afterColon = cleanValue(splitted.slice(1).join(":"))
      if (afterColon) {
        return afterColon
      }
    }

    const next = lines[index + 1]
    return next ? cleanValue(next) : ""
  }

  const collectAddress = (index: number): string => {
    if (index === -1) {
      return ""
    }

    const stopKeywords = [
      "rt",
      "rw",
      "dusun",
      "desa",
      "kel",
      "kelurahan",
      "kecamatan",
      "agama",
      "status",
      "perkawinan",
      "pekerjaan",
      "kewarganegaraan",
      "berlaku",
      "nik",
      "nama",
      "jenis",
      "gol.",
    ]

    const chunks: string[] = []
    const first = valueFromIndex(index)
    if (first) {
      chunks.push(first)
    }

    for (let pointer = index + 1; pointer < lines.length; pointer += 1) {
      const candidate = lines[pointer]
      const lower = lowerLines[pointer]
      if (stopKeywords.some((keyword) => lower.includes(keyword))) {
        break
      }

      chunks.push(candidate)
    }

    return cleanValue(chunks.join(", "))
  }

  let nik = ""
  const nikIndex = getIndex(["nik"])
  if (nikIndex !== -1) {
    const potential = lines[nikIndex].replace(/\D/g, "")
    if (potential.length >= 16) {
      nik = potential.slice(0, 16)
    } else {
      const neighbour = lines[nikIndex + 1]?.replace(/\D/g, "") ?? ""
      if (neighbour.length >= 16) {
        nik = neighbour.slice(0, 16)
      }
    }
  }

  if (!nik) {
    const digitsOnly = sanitized.replace(/\D/g, "")
    if (digitsOnly.length >= 16) {
      nik = digitsOnly.slice(0, 16)
    }
  }

  const nama = valueFromIndex(getIndex(["nama"]))
  const ttl = valueFromIndex(getIndex(["tempat", "lahir"]))
  const jenisKelamin = valueFromIndex(getIndex(["jenis", "kelamin"]))
  const pekerjaan = valueFromIndex(getIndex(["pekerjaan"]))
  const berlakuHingga = valueFromIndex(getIndex(["berlaku"]))
  const alamat = collectAddress(getIndex(["alamat"]))

  return {
    nik,
    nama,
    tempatTanggalLahir: ttl,
    alamat,
    jenisKelamin,
    pekerjaan,
    berlakuHingga,
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
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStatus, setOcrStatus] = useState<string | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [rawOcrText, setRawOcrText] = useState("")
  const [ocrLanguage, setOcrLanguage] = useState<string | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const workerInitPromiseRef = useRef<Promise<TesseractWorker> | null>(null)
  const workerRef = useRef<TesseractWorker | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      workerInitPromiseRef.current = null
      if (workerRef.current) {
        void workerRef.current.terminate()
        workerRef.current = null
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

  useEffect(() => {
    void ensureWorker().catch((error) => {
      console.error("Gagal memuat mesin OCR lebih awal", error)
    })
  }, [])
  const preprocessImage = async (imageFile: File): Promise<Blob | File> => {
    try {
      const bitmap = await createImageBitmap(imageFile)
      const maxDimension = 1400
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
      const targetWidth = Math.max(1, Math.round(bitmap.width * scale))
      const targetHeight = Math.max(1, Math.round(bitmap.height * scale))
      const canvas = document.createElement("canvas")
      canvas.width = targetWidth
      canvas.height = targetHeight
      const context = canvas.getContext("2d")
      if (!context) {
        bitmap.close()
        return imageFile
      }

      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = "high"
      context.drawImage(bitmap, 0, 0, targetWidth, targetHeight)
      bitmap.close()

      const imageData = context.getImageData(0, 0, targetWidth, targetHeight)
      const { data } = imageData
      for (let index = 0; index < data.length; index += 4) {
        const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114
        const normalized = gray > 210 ? 255 : gray < 60 ? 0 : gray
        data[index] = normalized
        data[index + 1] = normalized
        data[index + 2] = normalized
      }
      context.putImageData(imageData, 0, 0)

      const processedBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.82)
      })

      return processedBlob ?? imageFile
    } catch (error) {
      console.warn("Gagal memproses gambar sebelum OCR", error)
      return imageFile
    }
  }
  const ensureWorker = async (): Promise<TesseractWorker> => {
    if (workerRef.current) {
      return workerRef.current
    }

    if (workerInitPromiseRef.current) {
      return workerInitPromiseRef.current
    }

    setOcrStatus("Menyiapkan mesin OCR...")
    setOcrProgress(0)

    const initialization = (async () => {
      const { createWorker, PSM } = await import("tesseract.js")

      const logger = (message: LoggerMessage) => {
        if (!isMountedRef.current) {
          return
        }

        const readableStatus = statusMessages[message.status] ?? message.status
        setOcrStatus(readableStatus)
        if (typeof message.progress === "number") {
          setOcrProgress(message.progress)
        }
      }

      const requestedLanguage = "ind"
      let languageUsed = requestedLanguage
      let worker: TesseractWorker

      try {
        worker = await createWorker(requestedLanguage, undefined, { logger })
        await worker.load()
      } catch (error) {
        console.warn("Gagal memuat bahasa", requestedLanguage, error)
        languageUsed = "eng"
        if (isMountedRef.current) {
          setOcrStatus("Model bahasa Indonesia belum tersedia, memakai bahasa Inggris...")
        }
        worker = await createWorker(languageUsed, undefined, { logger })
        await worker.load()
      }

      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: "1",
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz-.,/ ",
      })

      if (isMountedRef.current) {
        setOcrLanguage(languageUsed)
      }

      workerRef.current = worker
      return worker
    })()

    workerInitPromiseRef.current = initialization

    try {
      const worker = await initialization
      workerInitPromiseRef.current = null
      return worker
    } catch (error) {
      workerInitPromiseRef.current = null
      throw error
    }
  }

  const openCamera = () => {
    cameraInputRef.current?.click()
  }

  const openFilePicker = () => {
    galleryInputRef.current?.click()
  }

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
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
    setRawOcrText("")
    setOcrError(null)
    setIsProcessing(true)
    setOcrStatus("Mengoptimalkan foto KTP...")
    setOcrProgress(0)

    try {
      const preparedSource = await preprocessImage(file)
      if (!isMountedRef.current) {
        return
      }

      const worker = await ensureWorker()
      if (!isMountedRef.current) {
        return
      }

      setOcrStatus("Mengenali teks pada KTP...")
      const { data } = await worker.recognize(preparedSource)
      if (!isMountedRef.current) {
        return
      }

      setRawOcrText(data.text)
      const parsed = parseKtpData(data.text)
      setKtpData(parsed)

      if (!parsed.nik && !parsed.nama) {
        setOcrError("Model OCR belum berhasil mendeteksi data utama. Periksa hasil mentah di bawah ini.")
      }
    } catch (error) {
      console.error("OCR gagal", error)
      if (isMountedRef.current) {
        setOcrError("Gagal memproses gambar. Coba ulangi dengan foto yang lebih jelas.")
      }
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false)
        setOcrStatus(null)
        setOcrProgress(0)
      }
    }

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

    console.table({ ...formData, catatan: notes, sumber: fileName, ocr: rawOcrText })
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

  const progressPercent = Math.round(Math.min(1, Math.max(0, ocrProgress)) * 100)

  const secondaryActions: Array<{
    key: string
    label: string
    description: string
    gradient: string
    onClick: () => void
    icon: ReactNode
  }> = [
    {
      key: "upload",
      label: "Upload",
      description: "Ambil dari galeri",
      gradient: "from-[#f1edff] to-[#ebe4ff]",
      onClick: openFilePicker,
      icon: (
        <svg className="h-6 w-6 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 5.5v10" strokeLinecap="round" />
          <path d="M8.5 9 12 5.5 15.5 9" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="4" y="13" width="16" height="6" rx="2" />
        </svg>
      ),
    },
    {
      key: "convert",
      label: "Convert",
      description: "PDF ke teks",
      gradient: "from-[#fceeff] to-[#f7e5ff]",
      onClick: () => console.info("convert action placeholder"),
      icon: (
        <svg className="h-6 w-6 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M9 8h6M9 12h6M9 16h3" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      key: "assist",
      label: "Ask AI",
      description: "Bantuan cepat",
      gradient: "from-[#fff2d8] to-[#ffe6b4]",
      onClick: () => console.info("ai assistant placeholder"),
      icon: (
        <svg className="h-6 w-6 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 4v4" strokeLinecap="round" />
          <path d="M12 16v4" strokeLinecap="round" />
          <path d="M20 12h-4" strokeLinecap="round" />
          <path d="M8 12H4" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f9ff] via-white to-[#d7ecff] text-slate-900">
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 pb-24 pt-6">
        <header className="flex items-center justify-between">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm shadow-slate-200/60"
            aria-label="Buka menu"
          >
            <svg className="h-5 w-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 7h14M5 12h14M5 17h14" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm shadow-slate-200/60"
              aria-label="Notifikasi"
            >
              <svg className="h-5 w-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 5a5 5 0 0 1 5 5v3.5l1.4 2.8A1 1 0 0 1 17.5 17h-11a1 1 0 0 1-.9-1.7L7 13.5V10a5 5 0 0 1 5-5Z" />
                <path d="M9 18a3 3 0 0 0 6 0" strokeLinecap="round" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-500" />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-sm font-semibold text-white">
              IK
            </div>
          </div>
        </header>

        <section className="mt-9 space-y-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-400">Hi, Kannan</p>
            <h1 className="text-3xl font-semibold leading-tight">Hari ini kita mau scan apa?</h1>
            <p className="text-sm text-slate-500">Ambil foto KTP dan sistem akan mengisi formulir otomatis.</p>
          </div>

          <button
            type="button"
            onClick={openCamera}
            className="group flex w-full flex-col items-center justify-center gap-4 rounded-3xl bg-gradient-to-b from-[#e7efff] to-[#f1f6ff] p-6 text-slate-700 shadow-[0_25px_45px_-30px_rgba(37,99,235,0.45)] transition active:scale-[0.99]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-500 shadow-sm shadow-indigo-200/60">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M4 9a2 2 0 0 1 2-2h1.3a1 1 0 0 0 .8-.4l.7-.9a1 1 0 0 1 .8-.4h4.8a1 1 0 0 1 .8.4l.7.9a1 1 0 0 0 .8.4H18a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                <circle cx="12" cy="12.5" r="3.5" />
              </svg>
            </span>
            <div className="text-center">
              <p className="text-base font-semibold text-slate-700">Scan sekarang</p>
              <p className="text-xs font-medium text-slate-400">Gunakan kamera belakang untuk hasil terbaik</p>
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
                  <p className="text-sm font-semibold text-slate-700">{action.label}</p>
                  <p className="text-xs font-medium text-slate-400">{action.description}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-full border border-slate-200/80 bg-white/80 p-1 shadow-sm shadow-slate-200/40 backdrop-blur">
            <div className="flex items-center gap-3 rounded-full px-4 py-2">
              <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
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
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-6">
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
              <span className="truncate">Berkas aktif: <span className="text-slate-700">{fileName}</span></span>
              <button type="button" onClick={() => setFileName(null)} className="text-slate-400 transition hover:text-slate-600">
                Bersihkan
              </button>
            </div>
          ) : null}

          {ocrError && (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600 shadow-sm">
              {ocrError}
            </div>
          )}

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {previewUrl ? (
              <img src={previewUrl} alt={fileName ?? "Pratinjau foto KTP"} className="h-64 w-full object-cover" />
            ) : (
              <div className="flex h-64 flex-col items-center justify-center gap-5 px-6 text-center text-slate-400">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-300">
                  <svg className="h-9 w-9 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M8 11h8M8 15h4" />
                  </svg>
                </span>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-500">Belum ada foto KTP</p>
                  <p className="text-xs leading-relaxed text-slate-400">
                    Tekan tombol scan atau upload untuk mulai pemindaian. Pastikan foto tajam dan bebas pantulan cahaya.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Hasil ekstraksi</p>
                <p className="text-sm font-semibold text-slate-800">
                  {ktpData ? "Periksa dan koreksi data berikut" : "Data akan muncul setelah foto dianalisis"}
                </p>
              </div>
              <span
                className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                  ktpData ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
                }`}
              >
                {ktpData ? `Terbaca${ocrLanguage ? ` ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¯ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â½ ${ocrLanguage.toUpperCase()}` : ""}` : "Menunggu"}
              </span>
            </div>

            {rawOcrText && (
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Hasil OCR mentah</p>
                  {ocrLanguage && (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{ocrLanguage.toUpperCase()}</span>
                  )}
                </div>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-xs leading-relaxed text-slate-600">
                  {rawOcrText}
                </pre>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {fieldDefinitions.map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
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
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alamat</label>
                <textarea
                  rows={3}
                  value={formData.alamat}
                  onChange={handleAlamatChange}
                  placeholder="Alamat lengkap sesuai KTP"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Catatan petugas</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.currentTarget.value)}
                  placeholder="Contoh: Foto KTP perlu pengambilan ulang karena pantulan cahaya."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div className="space-y-3 pt-1">
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition active:translate-y-px"
                >
                  Simpan data KTP
                </button>
                {saveFeedback && <p className="text-center text-xs font-medium text-emerald-600">{saveFeedback}</p>}
                {lastSavedAt && (
                  <p className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    Pembaruan terakhir: {lastSavedAt}
                  </p>
                )}
              </div>
            </form>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white/80 p-5 text-sm text-slate-600 shadow-sm backdrop-blur">
          <h3 className="text-sm font-semibold uppercase tracking-[0.26em] text-slate-400">Tips akurasi pemindaian</h3>
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
      </main>
    </div>
  )
}

export default App
