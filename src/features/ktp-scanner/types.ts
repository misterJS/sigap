import type { ReactNode } from "react";

export type KtpData = {
  nik: string;
  nama: string;
  tempatTanggalLahir: string;
  alamat: string;
  jenisKelamin: string;
  pekerjaan: string;
  berlakuHingga: string;
};

export const emptyData: KtpData = {
  nik: "",
  nama: "",
  tempatTanggalLahir: "",
  alamat: "",
  jenisKelamin: "",
  pekerjaan: "",
  berlakuHingga: "",
};

export type KtpFormField = {
  key: keyof KtpData;
  label: string;
  placeholder: string;
};

export type SecondaryAction = {
  key: string;
  label: string;
  description: string;
  gradient: string;
  onClick: () => void;
  icon: ReactNode;
};
