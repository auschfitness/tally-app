import { describe, it, expect } from "vitest";
import { hasTestFixture, signInTestUser } from "@/test-support/supabase";
import { getLexShort, getOriginalChapter, getTaggedChapter } from "./reader-queries";

// Integração: tabelas bíblicas GLOBAIS (leitura livre). João 1 tem grego (m34); a
// ligação em português só existe depois da Tarefa 9 — o teste aceita vazio.
describe.skipIf(!hasTestFixture)("reader queries (integração)", () => {
  it("getOriginalChapter pagina e devolve João 1 inteiro, em ordem", async () => {
    const { supabase } = await signInTestUser();
    const words = await getOriginalChapter(supabase, "John", 1);
    expect(words.length).toBeGreaterThan(500);
    expect(words[0]?.verse).toBe(1);
    expect(words[0]?.position).toBe(1);
    expect(words.at(-1)?.verse).toBe(51);
  });

  it("getLexShort traz lema e glosa do Strong", async () => {
    const { supabase } = await signInTestUser();
    const lex = await getLexShort(supabase, ["G3056"]);
    expect(lex["G3056"]?.lemma?.normalize("NFC")).toBe("λόγος".normalize("NFC"));
  });

  it("getTaggedChapter devolve trechos ordenados (ou vazio antes da carga)", async () => {
    const { supabase } = await signInTestUser();
    const rows = await getTaggedChapter(supabase, "John", 1);
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1];
      const b = rows[i];
      if (a && b) expect(a.verse < b.verse || (a.verse === b.verse && a.position < b.position)).toBe(true);
    }
  });
});
