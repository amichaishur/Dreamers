"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import EntryForm from "@/components/EntryForm";
import { theme } from "@/lib/theme";
import { DiaryKey } from "@/lib/diary";
import { useLang } from "@/lib/i18n";
import { getEntry, getSharedEntry, updateEntry, deleteEntry, uploadAttachment, setEntrySharing, DbEntry } from "@/lib/supabase/data";

const p = theme;

export default function EditEntryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLang();
  const [entry, setEntry] = useState<DbEntry | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    getEntry(params.id).then(async (row) => {
      if (!alive) return;
      if (row) { setEntry(row); return; }
      // Not ours to edit — which is what happens when someone shares the address
      // of their own dream rather than its share link. If that dream was shared
      // with the community, show the reader the page meant for them instead of
      // telling them it does not exist.
      const shared = await getSharedEntry(params.id).catch(() => null);
      if (!alive) return;
      if (shared) { router.replace(`/d/${params.id}`); return; }
      setEntry(null);
    });
    return () => { alive = false; };
  }, [params.id, router]);

  if (entry === undefined) {
    return <main style={{ minHeight: "100svh", background: p.bg, color: p.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{t("se.loading")}</main>;
  }
  if (!entry) {
    // Genuinely nothing to show: either it was deleted, or it belongs to someone
    // else and was never shared. Say so, and offer the way back rather than
    // leaving the reader on a dead screen.
    return (
      <main style={{ minHeight: "100svh", background: p.bg, color: p.text, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "0 30px", textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{t("sd.notFound")}</div>
        <Link href="/home" style={{ padding: "12px 26px", borderRadius: 14, textDecoration: "none", fontSize: 14, fontWeight: 700, color: "#fff", background: `linear-gradient(135deg, ${p.fabFrom}, ${p.fabTo})` }}>
          {t("rx.backToWeave")}
        </Link>
      </main>
    );
  }

  const existingMediaName = entry.media_url ? entry.media_url.split("/").pop() : null;

  return (
    <EntryForm
      diaryKey={entry.type as DiaryKey}
      headerKey="ef.editIn"
      submitKey="ef.save"
      initial={{ title: entry.title, body: entry.body, lucidity: entry.lucidity, awareness: entry.awareness, kind: entry.kind, meta: entry.meta, shared: entry.visibility === "public", anonymous: entry.shared_anonymous, createdAt: entry.created_at }}
      existingMediaName={existingMediaName}
      entryId={entry.id}
      onBack={() => router.push("/journals")}
      onDelete={async () => {
        if (!confirm(t("se.deleteConfirm"))) return;
        await deleteEntry(entry.id);
        router.push("/journals");
        router.refresh();
      }}
      onSubmit={async (v) => {
        let media_url: string | null | undefined;
        if (v.file) media_url = await uploadAttachment(v.file);
        else if (v.removeExisting) media_url = null;
        // else leave undefined → keep existing

        await updateEntry(entry.id, {
          title: v.title,
          body: v.body,
          lucidity: entry.type === "dream" ? v.lucidity : null,
          awareness: entry.type === "dream" ? v.awareness : null,
          kind: v.kind,
          meta: v.meta,
          created_at: v.createdAt,
          ...(media_url !== undefined ? { media_url } : {}),
        });
        // Reconcile sharing (also refreshes the shared image URL if the file changed).
        await setEntrySharing(entry.id, { shared: v.shared, anonymous: v.anonymous });
        router.push("/journals");
        router.refresh();
      }}
    />
  );
}
