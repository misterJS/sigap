export type AppRoute = "scanner" | "logs";

export const APP_ROUTES: AppRoute[] = ["scanner", "logs"];

export const APP_ROUTE_LABEL: Record<AppRoute, string> = {
  scanner: "Scan KTP",
  logs: "Log Gerbang",
};
