import { useState, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "./AuthContext";

type AuthMode = "login" | "register";

const createInitialState = () => ({
  email: "",
  password: "",
  confirmPassword: "",
  fullName: "",
});
type FormState = ReturnType<typeof createInitialState>;

export function AuthForm() {
  const { signIn, signUp, isConfigured } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<FormState>(createInitialState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setInfo(null);
    setForm((prev) => ({
      ...prev,
      password: "",
      confirmPassword: "",
    }));
  };

  const handleChange =
    (field: keyof FormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const inputElement = event.currentTarget ?? (event.target as HTMLInputElement | null);
      if (!inputElement) return;
      const { value } = inputElement;
      setForm((prev) => ({ ...prev, [field]: value }));
      if (error) setError(null);
      if (info) setInfo(null);
    };

  const validate = () => {
    if (!form.email.trim() || !form.password.trim()) {
      return "Email dan kata sandi wajib diisi.";
    }

    if (mode === "register") {
      if (!form.fullName.trim()) {
        return "Nama lengkap wajib diisi.";
      }

      if (form.password.length < 6) {
        return "Gunakan kata sandi minimal 6 karakter.";
      }

      if (form.password !== form.confirmPassword) {
        return "Konfirmasi kata sandi tidak cocok.";
      }
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isConfigured) {
      setError(
        "Supabase belum dikonfigurasi di project ini. Hubungi admin untuk menambahkan kredensial."
      );
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setInfo(null);

    const nextState = createInitialState();
    try {
      if (mode === "login") {
        const { error: signInError } = await signIn(form.email, form.password);
        if (signInError) {
          setError(signInError);
          return;
        }
        setInfo("Berhasil masuk. Memuat data...");
      } else {
        const { error: signUpError } = await signUp(
          form.email,
          form.password,
          form.fullName.trim()
        );
        if (signUpError) {
          setError(signUpError);
          return;
        }
        setInfo(
          "Akun berhasil dibuat. Silakan cek email Anda untuk verifikasi lalu masuk."
        );
        setForm(nextState);
        setMode("login");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-900/5 backdrop-blur">
      <div className="mb-6 space-y-1 text-center">
        <h1 className="text-lg font-semibold text-slate-900">
          {mode === "login" ? "Masuk ke SIGAP" : "Daftar Akun Baru"}
        </h1>
        <p className="text-xs text-slate-500">
          Gunakan email internal untuk mengakses aplikasi.
        </p>
      </div>
      <div className="mb-4 rounded-2xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => handleModeChange("login")}
            className={`rounded-xl px-3 py-2 transition ${
              mode === "login"
                ? "bg-white text-slate-900 shadow-sm shadow-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("register")}
            className={`rounded-xl px-3 py-2 transition ${
              mode === "register"
                ? "bg-white text-slate-900 shadow-sm shadow-slate-200"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Registrasi
          </button>
        </div>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === "register" && (
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Nama lengkap
            </label>
            <input
              type="text"
              autoComplete="name"
              value={form.fullName}
              onChange={handleChange("fullName")}
              placeholder="Nama sesuai identitas"
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        )}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Email
          </label>
          <input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange("email")}
            placeholder="nama@perusahaan.com"
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Kata sandi
          </label>
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={form.password}
            onChange={handleChange("password")}
            placeholder="Minimal 6 karakter"
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
        {mode === "register" && (
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Konfirmasi kata sandi
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange("confirmPassword")}
              placeholder="Ulangi kata sandi"
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        )}
        {(error || info) && (
          <p
            className={`text-xs font-medium ${
              error ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            {error ?? info}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? mode === "login"
              ? "Memproses..."
              : "Mendaftarkan..."
            : mode === "login"
            ? "Masuk"
            : "Registrasi"}
        </button>
      </form>
    </div>
  );
}
