import type { KtpFormField } from "./types";

export const fieldDefinitions: KtpFormField[] = [
  { key: "nik", label: "NIK", placeholder: "Masukkan 16 digit NIK" },
  { key: "nama", label: "Nama lengkap", placeholder: "Nama sesuai KTP" },
  {
    key: "tempatTanggalLahir",
    label: "Tempat & Tanggal Lahir",
    placeholder: "Contoh: Semarang, 12-01-1994",
  },
  {
    key: "jenisKelamin",
    label: "Jenis kelamin",
    placeholder: "Laki-laki / Perempuan",
  },
  { key: "pekerjaan", label: "Pekerjaan", placeholder: "Pekerjaan saat ini" },
  {
    key: "berlakuHingga",
    label: "Berlaku hingga",
    placeholder: "Seumur Hidup / 12-12-2030",
  },
];
