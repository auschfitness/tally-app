"use client";

// /study/bible sem capítulo: abre o último lido neste aparelho, ou João 1. O gate da flag
// fica na página do capítulo (Server Component), para onde isto sempre redireciona.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LAST_READ_KEY, parseLastRead } from "@/features/study/reader";

export default function BibleEntryPage(): null {
  const router = useRouter();
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(LAST_READ_KEY);
    } catch {
      raw = null;
    }
    const ref = parseLastRead(raw);
    router.replace(`/study/bible/${ref.book}/${ref.chapter}`);
  }, [router]);
  return null;
}
