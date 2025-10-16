import { AuthProvider, useAuth } from "./features/auth/AuthContext";
import { AuthForm } from "./features/auth/AuthForm";
import { KtpScannerPage } from "./features/ktp-scanner/KtpScannerPage";

function AppShell() {
  const { user, loading, isConfigured } = useAuth();

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
              Supabase belum dikonfigurasi. Tambahkan kredensial di file <code>.env</code> agar
              proses login &amp; registrasi dapat digunakan.
            </div>
          )}
          <AuthForm />
        </div>
      </div>
    );
  }

  return <KtpScannerPage />;
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
