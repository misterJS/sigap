import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import { fieldDefinitions } from "./constants";
import { parseKtpData } from "./parser";
import {
  emptyData,
  type KtpData,
  type SecondaryAction,
} from "./types";
import { ScannerHeader } from "./components/ScannerHeader";
import { WelcomeSection } from "./components/WelcomeSection";
import { OcrStatusPanel } from "./components/OcrStatusPanel";
import { PreviewCard } from "./components/PreviewCard";
import { OcrResultForm } from "./components/OcrResultForm";
import { TipsSection } from "./components/TipsSection";

/* eslint-disable */
export function KtpScannerPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [ktpData, setKtpData] = useState<KtpData | null>(null);
  const [formData, setFormData] = useState<KtpData>(emptyData);
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [rawOcrText, setRawOcrText] = useState("");
  const [ocrLanguage, setOcrLanguage] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!ktpData) {
      setFormData(emptyData);
      return;
    }
    setFormData(ktpData);
  }, [ktpData]);

  useEffect(() => {
    if (!saveFeedback) return;
    const timeoutId = window.setTimeout(() => setSaveFeedback(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [saveFeedback]);

  const preprocessImage = async (imageFile: File): Promise<Blob | File> => {
    try {
      const bitmap =
        "createImageBitmap" in window
          ? await createImageBitmap(imageFile)
          : null;

      if (!bitmap) return imageFile;

      const maxDimension = 1400;
      const scale = Math.min(
        1,
        maxDimension / Math.max(bitmap.width, bitmap.height)
      );
      const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
      const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        bitmap.close();
        return imageFile;
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
      bitmap.close();

      const imageData = context.getImageData(0, 0, targetWidth, targetHeight);
      const { data } = imageData;

      for (let i = 0; i < data.length; i += 4) {
        const gray =
          data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const normalized = gray > 210 ? 255 : gray < 60 ? 0 : gray;
        data[i] = normalized;
        data[i + 1] = normalized;
        data[i + 2] = normalized;
      }
      context.putImageData(imageData, 0, 0);

      const processedBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.82);
      });

      return processedBlob ?? imageFile;
    } catch (error) {
      console.warn("Gagal memproses gambar sebelum OCR", error);
      return imageFile;
    }
  };

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Gagal membaca gambar sebagai data URL"));
        }
      };
      reader.onerror = () => reject(reader.error ?? new Error("Gagal membaca file"));
      reader.readAsDataURL(blob);
    });

  const openCamera = () => cameraInputRef.current?.click();
  const openFilePicker = () => galleryInputRef.current?.click();

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setFileName(file.name);

    setIsProcessing(true);
    setOcrError(null);
    setRawOcrText("");
    setOcrStatus("Mengoptimalkan foto KTP...");
    setOcrProgress(10);

    try {
      const prepared = await preprocessImage(file);

      setOcrStatus("Mengirim ke server untuk OCR...");
      setOcrProgress(35);

      const payloadBlob =
        prepared instanceof Blob ? prepared : new Blob([prepared], { type: file.type });
      const imageBase64 = await blobToDataUrl(payloadBlob);

      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64,
          originalFileName: file.name,
          mode: "ktp",
        }),
      });

      setOcrStatus("Menunggu hasil model...");
      setOcrProgress(55);

      const payload = await response.json().catch(() => null);

      setOcrStatus("Membaca hasil...");
      setOcrProgress(75);

      if (!payload?.ok) {
        throw new Error(payload?.error || `HTTP ${response.status}`);
      }

      if (payload.result) {
        const result = payload.result as KtpData;
        setKtpData(result);
        setFormData(result);
        setRawOcrText(JSON.stringify(result, null, 2));
        setOcrLanguage("gemini");
      } else if (payload.raw) {
        const raw: string = payload.raw;
        setRawOcrText(raw);

        let cleanedRaw = raw.trim();
        cleanedRaw = cleanedRaw.replace(/^```json\s*|```\s*$/g, "").trim();

        try {
          const parsedJson = JSON.parse(cleanedRaw);
          const result = parsedJson as KtpData;
          setKtpData(result);
          setFormData(result);
          setRawOcrText(JSON.stringify(result, null, 2));
          setOcrLanguage("gemini (JSON-parsed)");
        } catch (jsonError) {
          console.warn(
            "Gagal parsing JSON dari raw output, menggunakan parser lokal.",
            jsonError
          );
          const parsed = parseKtpData(cleanedRaw);
          setKtpData(parsed);
          setFormData(parsed);
          setOcrLanguage("parser lokal");
          if (!parsed.nik && !parsed.nama) {
            setOcrError(
              "Model mengembalikan teks mentah yang tidak dapat diparse. Cek 'Hasil OCR mentah'."
            );
          }
        }
      } else if (payload.text) {
        const raw: string = payload.text;
        setRawOcrText(raw);
        const parsed = parseKtpData(
          raw.replace(/^```json\s*|```\s*$/g, "").trim()
        );
        setKtpData(parsed);
        setFormData(parsed);
        setOcrLanguage("parser lokal");
      }

      setOcrProgress(100);
    } catch (error: any) {
      console.error(error);
      setOcrError(error?.message || "Gagal memproses gambar.");
    } finally {
      setIsProcessing(false);
      setOcrStatus(null);
      setTimeout(() => setOcrProgress(0), 400);
      try {
        if (event.currentTarget) event.currentTarget.value = "";
      } catch {}
    }
  };

  const handleFieldChange = (field: keyof KtpData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAlamatChange = (value: string) => {
    setFormData((prev) => ({ ...prev, alamat: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveFeedback(null);

    const now = new Date();
    const formattedDate = now.toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    try {
      if (isSupabaseConfigured) {
        const dataToSave = {
          nik: formData.nik,
          nama: formData.nama,
          tempat_tanggal_lahir: formData.tempatTanggalLahir,
          alamat: formData.alamat,
          jenis_kelamin: formData.jenisKelamin,
          pekerjaan: formData.pekerjaan,
          berlaku_hingga: formData.berlakuHingga,
          operator_notes: notes,
          source_file_name: fileName,
          raw_ocr_text: rawOcrText,
          ocr_language: ocrLanguage,
        };

        const { error } = await supabase
          .from("ktp_submissions")
          .insert([dataToSave]);

        if (error) {
          throw new Error(error.message);
        }

        setSaveFeedback("�o. Data KTP berhasil disimpan ke Supabase.");
        setLastSavedAt(formattedDate);
        console.info("Data berhasil disimpan ke Supabase:", dataToSave);
      } else {
        setSaveFeedback(
          "�s��,? Supabase tidak dikonfigurasi. Data tersimpan sebagai draft lokal di console."
        );
        setLastSavedAt(formattedDate);
        console.table({
          ...formData,
          catatan: notes,
          sumber: fileName,
          ocr: rawOcrText,
          is_draft: true,
        });
      }
    } catch (error: any) {
      console.error("Gagal menyimpan data:", error);
      setSaveFeedback(
        `�?O Gagal menyimpan data: ${error.message || "Kesalahan tak terduga"}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const progressPercent = Math.round(
    Math.min(1, Math.max(0, ocrProgress / 100)) * 100
  );

  const secondaryActions: SecondaryAction[] = [
    {
      key: "upload",
      label: "Upload",
      description: "Ambil dari galeri",
      gradient: "from-[#f1edff] to-[#ebe4ff]",
      onClick: openFilePicker,
      icon: (
        <svg
          className="h-6 w-6 text-indigo-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M12 5.5v10" strokeLinecap="round" />
          <path
            d="M8.5 9 12 5.5 15.5 9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
        <svg
          className="h-6 w-6 text-purple-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
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
        <svg
          className="h-6 w-6 text-amber-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M12 4v4" strokeLinecap="round" />
          <path d="M12 16v4" strokeLinecap="round" />
          <path d="M20 12h-4" strokeLinecap="round" />
          <path d="M8 12H4" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f9ff] via-white to-[#d7ecff] text-slate-900">
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 pb-24 pt-6">
        <ScannerHeader userInitials="IK" />
        <WelcomeSection
          onPrimaryAction={openCamera}
          secondaryActions={secondaryActions}
        />
        <section className="mt-8 space-y-6">
          <OcrStatusPanel
            isProcessing={isProcessing}
            ocrStatus={ocrStatus}
            progressPercent={progressPercent}
            fileName={fileName}
            onClearFile={() => setFileName(null)}
            ocrError={ocrError}
          />
          <PreviewCard previewUrl={previewUrl} fileName={fileName} />
          <OcrResultForm
            ktpData={ktpData}
            formData={formData}
            rawOcrText={rawOcrText}
            ocrLanguage={ocrLanguage}
            notes={notes}
            isSaving={isSaving}
            saveFeedback={saveFeedback}
            lastSavedAt={lastSavedAt}
            isSupabaseConfigured={isSupabaseConfigured}
            fields={fieldDefinitions}
            onSubmit={handleSubmit}
            onFieldChange={handleFieldChange}
            onAlamatChange={handleAlamatChange}
            onNotesChange={setNotes}
          />
        </section>
        <TipsSection />
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
  );
}
