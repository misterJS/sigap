import { useMemo } from "react";
import { useAuth } from "../auth/AuthContext";
import { extractUserIdentity } from "../auth/userMetadata";
import {
  APP_ROUTE_DESCRIPTION,
  APP_ROUTE_ICONS,
  APP_ROUTE_LABEL,
  APP_ROUTES,
  type AppRoute,
} from "./routes";

type SidebarProps = {
  activeRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  onSignOut: () => void;
};

const navItems = APP_ROUTES.map((route) => ({
  key: route,
  label: APP_ROUTE_LABEL[route],
  description: APP_ROUTE_DESCRIPTION[route],
  Icon: APP_ROUTE_ICONS[route],
}));

export function AppSidebar({ activeRoute, onNavigate, onSignOut }: SidebarProps) {
  const { user } = useAuth();
  const identity = useMemo(() => extractUserIdentity(user), [user]);

  return (
    <aside className="hidden w-72 flex-col border-r border-slate-200/80 bg-white/95 p-6 shadow-[0_0_40px_-30px_rgba(15,23,42,0.65)] backdrop-blur xl:flex">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900/90 text-base font-semibold text-white">
          {identity.initials}
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-slate-800">
            {identity.name || "Petugas"}
          </p>
          {identity.email && (
            <p className="text-xs font-medium text-slate-400">{identity.email}</p>
          )}
        </div>
      </div>

      <div className="mt-10 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Navigasi
        </p>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = item.key === activeRoute;
            const Icon = item.Icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/25"
                    : "border-slate-200 bg-white/80 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isActive ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p
                      className={`text-xs font-medium ${
                        isActive ? "text-white/80" : "text-slate-400"
                      }`}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto pt-10">
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm shadow-slate-200 transition hover:border-slate-300 hover:text-slate-900 active:translate-y-px"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 5h-2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2" />
            <path d="M16 17 21 12 16 7" />
            <path d="M21 12H9" />
          </svg>
          Keluar
        </button>
      </div>
    </aside>
  );
}
