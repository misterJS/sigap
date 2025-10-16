import type { JSX } from "react";

export type AppRoute = "scanner" | "logs";

export const APP_ROUTES: AppRoute[] = ["scanner", "logs"];

export const APP_ROUTE_LABEL: Record<AppRoute, string> = {
  scanner: "Scan KTP",
  logs: "Log Gerbang",
};

export const APP_ROUTE_DESCRIPTION: Record<AppRoute, string> = {
  scanner: "Ambil foto dan simpan data pendatang",
  logs: "Pantau keluar-masuk berdasarkan petugas",
};

export const APP_ROUTE_ICONS: Record<AppRoute, () => JSX.Element> = {
  scanner: () => (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <circle cx="12" cy="12" r="3" />
      <path d="M9.5 5.5V3M14.5 5.5V3M4 9.5H2M22 9.5h-2" />
    </svg>
  ),
  logs: () => (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
      <rect x="3" y="3" width="18" height="18" rx="4" />
    </svg>
  ),
};
