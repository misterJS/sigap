import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" })); // naikin limit dikit

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY belum di-set");
  process.exit(1);
}

const genai = new GoogleGenAI({ apiKey });
const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const extractText = (response: any): string => {
  if (!response) {
    return "";
  }

  if (typeof response.text === "string" && response.text.trim().length > 0) {
    return response.text.trim();
  }

  const candidates =
    response.candidates ??
    response.response?.candidates ??
    response.result?.candidates ??
    [];

  const collected: string[] = [];
  for (const candidate of candidates) {
    const parts = candidate?.content?.parts ?? candidate?.parts ?? [];
    for (const part of parts) {
      const value = typeof part?.text === "string" ? part.text.trim() : "";
      if (value) {
        collected.push(value);
      }
    }
  }

  return collected.join("\n").trim();
};

app.post("/api/ocr", async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const { imageBase64, mode = "ktp" } = req.body as {
      imageBase64: string; // dataURL: "data:image/jpeg;base64,...."
      mode?: "plain" | "ktp";
    };

    if (!imageBase64) {
      return res.status(400).json({ ok: false, error: "imageBase64 kosong" });
    }

    // Ambil mime & base64 dari dataURL (supaya jpeg/png kedeteksi benar)
    const m = imageBase64.match(/^data:(.+?);base64,(.+)$/);
    if (!m) {
      return res
        .status(400)
        .json({ ok: false, error: "Format dataURL tidak valid" });
    }
    const mimeType = m[1]; // contoh: image/jpeg
    const base64Data = m[2];

    const parts =
      mode === "ktp"
        ? [
            {
              text: `Ekstrak data dari foto KTP Indonesia. Kembalikan HANYA JSON valid tanpa penjelasan:
{
  "nik": string,
  "nama": string,
  "tempatTanggalLahir": string,
  "alamat": string,
  "jenisKelamin": string,
  "pekerjaan": string,
  "berlakuHingga": string
}
Jika ragu, isi string kosong.`,
            },
            { inlineData: { mimeType, data: base64Data } },
          ]
        : [
            {
              text: "Extract ALL readable text from this image. Return plain UTF-8 text only.",
            },
            { inlineData: { mimeType, data: base64Data } },
          ];

    const result = await genai.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts }],
      config: { responseModalities: ["TEXT"] },
    });
    const out = extractText(result);

    if (mode === "ktp") {
      try {
        const parsed = JSON.parse(out);
        return res.status(200).json({ ok: true, result: parsed });
      } catch {
        // kalau model tidak mengirim JSON valid, kirim raw untuk client parse
        return res.status(200).json({ ok: true, raw: out });
      }
    }

    return res.status(200).json({ ok: true, text: out });
  } catch (e: any) {
    // log ke server biar kelihatan sebab 500-nya
    console.error(
      "[/api/ocr] ERROR:",
      e?.errorDetails ?? e?.response?.data ?? e?.message ?? e
    );
    return res
      .status(500)
      .json({ ok: false, error: e?.message ?? "Internal Server Error" });
  }
});

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log("OCR server listening on http://localhost:" + port);
});
