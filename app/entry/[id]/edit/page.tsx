"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EntryForm from "@/components/EntryForm";
import { theme } from "@/lib/theme";
import { DiaryKey } from "@/lib/diary";
import { useLang } from "@/lib/i18n";
import { getEntry, updateEntry, uploadAttachment, setEntrySharing, DbEntry } from "@/lib/supabase/data";

const p = theme;

export default function EditEntryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLang();
  const [entry, setEntry] = useState<DbEntry | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    getEntry(params.id).then((row) => { if (alive) setEntry(row); });
    return () => { alive = false; };
  }, [params.id]);

  if (entry === undefined) {
    return <main style={{ minHeight: "100svh", background: p.bg, color: p.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{t("se.loading")}</main>;
  }
  if (!entry) {
    return <main style={{ minHeight: "100svh", background: p.bg, color: p.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600 }}>{t("se.notFound")}</main>;
  }

  const existingMediaName = entry.media_url ? entry.media_url.split("/").pop() : null;

  return (
    <EntryForm
      diaryKey={entry.type as DiaryKey}
      headerKey="ef.editIn"
      submitKey="ef.save"
      initial={{ title: entry.title, body: entry.body, lucidity: entry.lucidity, shared: entry.visibility === "public", anonymous: entry.shared_anonymous }}
      existingMediaName={existingMediaName}
      onBack={() => router.push(`/entry/${entry.id}`)}
      onSubmit={async (v) => {
        let media_url: string | null | undefined;
        if (v.file) media_url = await uploadAttachment(v.file);
        else if (v.removeExisting) media_url = null;
        // else leave undefined → keep existing

        await updateEntry(entry.id, {
          title: v.title,
          body: v.body,
          lucidity: entry.type === "dream" ? v.lucidity : null,
          ...(media_url !== undefined ? { media_url } : {}),
        });
        // Reconcile sharing (also refreshes the shared image URL if the file changed).
        await setEntrySharing(entry.id, { shared: v.shared, anonymous: v.anonymous });
        router.push(`/entry/${entry.id}`);
        router.refresh();
      }}
    />
  );
}
