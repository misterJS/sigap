import type { KtpData } from "./types";

/* eslint-disable */
export const cleanValue = (value: string) =>
  value
    .replace(/\s+/g, " ")
    .replace(/^[,.;:|\-]+/, "")
    .trim();

export const parseKtpData = (rawText: string): KtpData => {
  let text = rawText
    .replace(/\r/g, "")
    .replace(/[^\x20-\x7E]/g, ".")
    .replace(/[`´’‘]/g, "'")
    .replace(/\s*([:.\-?"'])\s*/g, " $1 ")
    .replace(/\bNIK\s+i\b/gi, "NIK")
    .replace(/Tempat\s*Tg[iI]/gi, "Tempat/Tgl")
    .replace(/\b[JL]\s*(?:[:.\-?"'])?\s*([A-Z0-9])/gi, "JALAN $1")
    .toUpperCase();

  text = text.replace(
    /(\b(PROVINSI|KABUPATEN|KOTA|ALAMAT|NAMA|NIK|JENIS\s*KELAMIN|TEMPAT.*LAHIR|PEKERJAAN|BERLAKU.*HINGGA|STATUS|AGAMA|KEWARGANEGARAAN|KEL\/?DESA|KEL\s*DESA|RT\/?RW|KECAMATAN)\b)\s*[.:\-?"']\s*/g,
    "$1: "
  );

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const isLabel = (value: string) =>
    /^(PROVINSI|KABUPATEN|KOTA|NIK|NAMA|TEMPAT.*LAHIR|JENIS\s*KELAMIN|ALAMAT|RT\/?RW|KEL\/?DESA|KEL\s*DESA|KECAMATAN|AGAMA|STATUS|PEKERJAAN|KEWARGANEGARAAN|BERLAKU.*HINGGA)\b/.test(
      value
    );

  const afterColon = (value: string) => {
    const index = value.indexOf(":");
    return index >= 0 ? value.slice(index + 1).trim() : "";
  };

  const findIdx = (pattern: RegExp) =>
    lines.findIndex((line) => pattern.test(line));

  const takeValue = (index: number, options?: { lookahead?: number }) => {
    if (index < 0) return "";
    const lookahead = Math.max(1, options?.lookahead ?? 2);
    const direct = afterColon(lines[index]);
    if (direct) return direct;
    for (let step = 1; step <= lookahead; step += 1) {
      const candidate = lines[index + step];
      if (!candidate) break;
      if (isLabel(candidate)) break;
      const value = afterColon(candidate) || candidate;
      if (value && !isLabel(value)) return value.trim();
    }
    return "";
  };

  let nik = "";
  {
    const nikIdx = findIdx(/^NIK\b/);
    const scope =
      nikIdx >= 0 ? [lines[nikIdx], lines[nikIdx + 1] ?? ""].join(" ") : text;
    const near = scope.match(/\b(\d{16,})\b/);
    if (near) nik = near[1].slice(0, 16);
    if (!nik) {
      const any = text.replace(/\D/g, "");
      if (any.length >= 16) nik = any.slice(0, 16);
    }
  }

  const nama = (() => {
    const index = findIdx(/^NAMA\b/);
    let value = takeValue(index, { lookahead: 1 });
    value = value.replace(/\bA[DL]\b$|\bST\b$|\bAD\b$/g, "").trim();
    return value;
  })();

  const tempatTanggalLahir = (() => {
    const index = findIdx(/^TEMPAT.*LAHIR\b|^TEMPAT\/TGL\b/);
    let value = takeValue(index, { lookahead: 1 });
    const match = value.match(
      /([A-Z .'\-T]+),?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/
    );
    if (match) {
      const place = match[1].replace(/\s+/g, " ").trim();
      const datePart = match[2];
      const dateNormalized = datePart.replace(/[/.]/g, "-");
      return `${place}, ${dateNormalized}`;
    }
    return value;
  })();

  const jenisKelamin = (() => {
    const index = findIdx(/^JENIS\s*KELAMIN\b/);
    let value = takeValue(index, { lookahead: 1 });
    value = value
      .replace(/[^A-Z \-]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (/\bLAKI.*LAKI\b|\bPRIA\b|\bMALE\b/.test(value)) return "LAKI-LAKI";
    if (/\bPEREMPUAN\b|\bWANITA\b|\bFEMALE\b/.test(value)) return "PEREMPUAN";

    const slashIdx = value.indexOf("/");
    if (slashIdx > 0) {
      const firstPart = value.slice(0, slashIdx).trim();
      if (/\bLAKI.*LAKI\b|\bPRIA\b|\bMALE\b/.test(firstPart)) return "LAKI-LAKI";
      if (/\bPEREMPUAN\b|\bWANITA\b|\bFEMALE\b/.test(firstPart))
        return "PEREMPUAN";
    }

    return value;
  })();

  const alamat = (() => {
    const alamatIdx = findIdx(/^ALAMAT\b/);
    const pieces: string[] = [];
    const first = takeValue(alamatIdx, { lookahead: 1 });

    if (first) {
      pieces.push(first);
    }

    const rtIdx = findIdx(/^RT\/?RW\b/);
    if (rtIdx >= 0) {
      const rt = takeValue(rtIdx, { lookahead: 1 }).replace(/\s+/g, "");
      if (rt && !pieces.some((piece) => piece.includes(rt))) {
        pieces.push(`RT/RW ${rt}`);
      }
    }

    const kelIdx = findIdx(/^(KEL\/?DESA|KEL\s*DESA)\b/);
    if (kelIdx >= 0) {
      const kel = takeValue(kelIdx, { lookahead: 1 }).replace(/^-/, "").trim();
      if (kel) pieces.push(`KEL/DESA ${kel}`);
    }

    const kecIdx = findIdx(/^KECAMATAN\b/);
    if (kecIdx >= 0) {
      const kec = takeValue(kecIdx, { lookahead: 1 })
        .replace(/^[.\-]/, "")
        .trim();
      if (kec) pieces.push(`KECAMATAN ${kec}`);
    }

    const uniquePieces = Array.from(
      new Set(pieces.filter((piece) => piece.length > 0))
    ).join(", ");

    let finalAlamat = cleanValue(uniquePieces);
    finalAlamat = finalAlamat
      .replace(/\bJL\s+/g, "JALAN ")
      .replace(/DESA\//g, "DESA ");

    return finalAlamat;
  })();

  const pekerjaan = (() => {
    const index = findIdx(/^PEKERJAAN\b/);
    let value = takeValue(index, { lookahead: 1 });
    value = value.replace(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b$/, "").trim();
    value = value.replace(/^-\s*/, "");
    return value;
  })();

  const berlakuHingga = (() => {
    const index = findIdx(/^BERLAKU.*HINGGA\b/);
    let value = takeValue(index, { lookahead: 2 });
    if (/SEUMUR\s*HIDUP/.test(value)) return "SEUMUR HIDUP";
    const match = value.match(/(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/);
    if (match) return match[1].replace(/[/.]/g, "-");
    return value;
  })();

  return {
    nik: cleanValue(nik),
    nama: cleanValue(nama),
    tempatTanggalLahir: cleanValue(tempatTanggalLahir),
    alamat: cleanValue(alamat),
    jenisKelamin: cleanValue(jenisKelamin),
    pekerjaan: cleanValue(pekerjaan),
    berlakuHingga: cleanValue(berlakuHingga),
  };
};
