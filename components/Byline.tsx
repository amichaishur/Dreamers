"use client";

import { useLang } from "@/lib/i18n";

/**
 * Who shared a memory, said the same way everywhere it is said.
 *
 * Three cases: a real name, a nickname, or nobody. A nickname always carries a
 * small "nickname" tag, because without it anyone could share anonymously under
 * a real member's name and read as that member.
 */
export default function Byline({ anonymous, name, color }: { anonymous: boolean; name: string | null; color?: string }) {
  const { t } = useLang();
  if (!name) return <>{anonymous ? t("jr.byAnon") : null}</>;
  return (
    <>
      {t("jr.by")} {name}
      {anonymous && (
        <span style={{ fontSize: "0.85em", padding: "0 6px", marginInlineStart: 5, borderRadius: 6, background: "rgba(154,124,235,0.18)", color: color ?? "#C9B6F2", whiteSpace: "nowrap" }}>
          {t("jr.nickTag")}
        </span>
      )}
    </>
  );
}
