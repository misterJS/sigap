import type { User } from "@supabase/supabase-js";

const deriveInitials = (name?: string | null, fallback?: string | null) => {
  const cleanedName = name?.trim();
  if (cleanedName) {
    const parts = cleanedName.split(/\s+/).filter(Boolean);
    if (parts.length > 0) {
      const initials = parts
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
      if (initials) return initials;
    }
  }

  const cleanedFallback = fallback?.trim().toUpperCase();
  if (cleanedFallback) {
    const alphanumeric = cleanedFallback.replace(/[^A-Z0-9]/g, "");
    if (alphanumeric) return alphanumeric.slice(0, 2);
  }

  return "SG";
};

export const extractUserIdentity = (user: User | null | undefined) => {
  const metadata = user?.user_metadata ?? {};
  const name =
    (metadata.fullName as string | undefined) ??
    (metadata.full_name as string | undefined) ??
    (metadata.name as string | undefined) ??
    null;
  const email =
    (typeof metadata.email === "string" && metadata.email) || user?.email || null;
  const initials = deriveInitials(name, email);

  return {
    name,
    email,
    initials,
    id: user?.id ?? null,
  };
};
