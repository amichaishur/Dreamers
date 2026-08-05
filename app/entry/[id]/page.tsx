"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { theme } from "@/lib/theme";
import { useLang } from "@/lib/i18n";

const p = theme;

/**
 * Your own memories open straight into the form that made them, ready to change
 * and save. Row-level security means the only entries loadable here are your own,
 * so there is nothing worth showing read-only. Community memories live at /d/[id].
 */
export default function EntryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLang();

  useEffect(() => {
    router.replace(`/entry/${params.id}/edit`);
  }, [params.id, router]);

  return (
    <main style={{ minHeight: "100svh", background: p.bg, color: p.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
      {t("se.loading")}
    </main>
  );
}
