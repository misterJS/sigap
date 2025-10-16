import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AuthProvider, useAuth } from "./features/auth/AuthContext";
import { AuthForm } from "./features/auth/AuthForm";
import { KtpScannerPage } from "./features/ktp-scanner/KtpScannerPage";
import { AppSidebar } from "./features/layout/AppSidebar";
import { AccessLogsPage } from "./features/logs/AccessLogsPage";
import {
  APP_ROUTE_ICONS,
  APP_ROUTE_LABEL,
  APP_ROUTES,
  type AppRoute,
} from "./features/layout/routes";

function AuthenticatedApp({
  onSignOut,
}: {
  user: User;
  onSignOut: () => void;
}) {
  const [activeRoute, setActiveRoute] = useState<AppRoute>("scanner");

  return (
    <div className="flex min-h-screen bg-slate-100">
      <AppSidebar
        activeRoute={activeRoute}
        onNavigate={setActiveRoute}
        onSignOut={onSignOut}
      />
      <div className="relative isolate flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-[#f7f9ff] via-white to-[#d7ecff]">
        <main className="flex flex-1 flex-col overflow-y-auto pb-24">
          {activeRoute === "scanner" ? <KtpScannerPage /> : <AccessLogsPage />}
        </main>
        <nav className="fixed bottom-0 inset-x-0 border-t border-slate-200/70 bg-white/90 px-4 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-12px_30px_-25px_rgba(15,23,42,0.45)] backdrop-blur xl:hidden">
          <div className="flex items-center justify-around gap-3">
            {APP_ROUTES.map((route) => {
              const isActive = route === activeRoute;
              const label = APP_ROUTE_LABEL[route];
              const Icon = APP_ROUTE_ICONS[route];
              return (
                <button
                  key={route}
                  type="button"
                  onClick={() => setActiveRoute(route)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm shadow-slate-900/20"
                      : "border-transparent bg-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon />
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

function AppShell() {
  const { user, loading, isConfigured, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f7f9ff] via-white to-[#d7ecff]">
        <div className="rounded-3xl border border-slate-200 bg-white/90 px-6 py-5 text-sm font-medium text-slate-600 shadow-lg shadow-slate-900/10">
          Memuat sesi pengguna...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f7f9ff] via-white to-[#d7ecff] px-6 py-12">
        <div className="flex w-full max-w-md flex-col gap-4">
          {!isConfigured && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700 shadow-sm shadow-amber-200/60">
              Supabase belum dikonfigurasi. Tambahkan kredensial di file{" "}
              <code>.env</code> agar proses login &amp; registrasi dapat
              digunakan.
            </div>
          )}
          <AuthForm />
        </div>
      </div>
    );
  }

  return (
    <AuthenticatedApp
      user={user}
      onSignOut={() => {
        void signOut();
      }}
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
