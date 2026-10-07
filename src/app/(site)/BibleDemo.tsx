"use client";

import { useState } from "react";
import s from "./site.module.css";

// Demo tocável da landing: João 1.1 com as palavras ligadas ao grego, como no Estudo.
// Dados fixos (Bíblia Livre / WEB, Strong) para a página não depender do banco.

type Lang = "pt" | "en";
type Key = "arche" | "eimi" | "logos" | "pros" | "theos";

type Lex = { greek: string; translit: string; strong: string; gloss: string; note: string };

const LEX: Record<Lang, Record<Key, Lex>> = {
  pt: {
    arche: { greek: "ἀρχή", translit: "archē", strong: "G746", gloss: "princípio, origem", note: "O ponto de partida de tudo. João ecoa Gênesis 1.1: antes de qualquer coisa existir, a Palavra já estava lá." },
    eimi: { greek: "εἰμί", translit: "eimi", strong: "G1510", gloss: "ser, existir", note: "Aparece como ἦν, no imperfeito. O texto não diz que a Palavra começou a existir; diz que ela já era quando tudo começou." },
    logos: { greek: "λόγος", translit: "logos", strong: "G3056", gloss: "palavra, razão, mensagem", note: "Para o leitor judeu, a palavra com que Deus cria. Para o grego, a razão que ordena o mundo. João usa as duas pontes e diz: é uma pessoa." },
    pros: { greek: "πρός", translit: "pros", strong: "G4314", gloss: "junto de, voltado para", note: "Mais que estar ao lado: indica relação, comunhão face a face." },
    theos: { greek: "θεός", translit: "theos", strong: "G2316", gloss: "Deus", note: "No fim do versículo vem sem artigo e antes do verbo: a Palavra tem a natureza de Deus, sem se confundir com o Pai." },
  },
  en: {
    arche: { greek: "ἀρχή", translit: "archē", strong: "G746", gloss: "beginning, origin", note: "The starting point of everything. John echoes Genesis 1:1: before anything existed, the Word was already there." },
    eimi: { greek: "εἰμί", translit: "eimi", strong: "G1510", gloss: "to be, to exist", note: "It appears as ἦν, in the imperfect. The text does not say the Word began to exist; it says the Word already was when everything began." },
    logos: { greek: "λόγος", translit: "logos", strong: "G3056", gloss: "word, reason, message", note: "For a Jewish reader, the word by which God creates. For a Greek, the reason that orders the world. John crosses both bridges and says: it is a person." },
    pros: { greek: "πρός", translit: "pros", strong: "G4314", gloss: "with, toward", note: "More than being beside: it speaks of relationship, communion face to face." },
    theos: { greek: "θεός", translit: "theos", strong: "G2316", gloss: "God", note: "At the end of the verse it comes without the article and before the verb: the Word shares the nature of God without being confused with the Father." },
  },
};

// Texto em pedaços: string = texto solto, [texto, chave] = palavra tocável.
type Piece = string | [string, Key];

const VERSE: Record<Lang, Piece[]> = {
  pt: ["No ", ["princípio", "arche"], " ", ["era", "eimi"], " a ", ["Palavra", "logos"], ", e a ", ["Palavra", "logos"], " estava ", ["junto de", "pros"], " ", ["Deus", "theos"], ", e a ", ["Palavra", "logos"], " ", ["era", "eimi"], " ", ["Deus", "theos"], "."],
  en: ["In the ", ["beginning", "arche"], " ", ["was", "eimi"], " the ", ["Word", "logos"], ", and the ", ["Word", "logos"], " ", ["was", "eimi"], " ", ["with", "pros"], " ", ["God", "theos"], ", and the ", ["Word", "logos"], " ", ["was", "eimi"], " ", ["God", "theos"], "."],
};

const GREEK: Piece[] = ["Ἐν ", ["ἀρχῇ", "arche"], " ", ["ἦν", "eimi"], " ὁ ", ["λόγος", "logos"], ", καὶ ὁ ", ["λόγος", "logos"], " ", ["ἦν", "eimi"], " ", ["πρὸς", "pros"], " τὸν ", ["θεόν", "theos"], ", καὶ ", ["θεὸς", "theos"], " ", ["ἦν", "eimi"], " ὁ ", ["λόγος", "logos"], "."];

const PUNCT = /^[,.;:]+/;

const UI = {
  pt: { book: "João 1", version: "Bíblia Livre", hint: "Toque numa palavra", note: "Nota de estudo", label: "Palavra" },
  en: { book: "John 1", version: "World English Bible", hint: "Tap a word", note: "Study note", label: "Word" },
};

export function BibleDemo({ lang }: { lang: Lang }) {
  const [sel, setSel] = useState<Key>("logos");
  const ui = UI[lang];
  const lex = LEX[lang][sel];

  // A pontuação logo depois de uma palavra tocável fica presa a ela (sem "Deus" / ", e a" em linhas separadas).
  const render = (pieces: Piece[], greek = false) =>
    pieces.map((p, i) => {
      if (typeof p === "string") {
        const afterWord = i > 0 && typeof pieces[i - 1] !== "string";
        return <span key={i}>{afterWord ? p.replace(PUNCT, "") : p}</span>;
      }
      const next = pieces[i + 1];
      const punct = typeof next === "string" ? next.match(PUNCT)?.[0] : undefined;
      const word = (
        <button
          key={i}
          type="button"
          className={s.word}
          data-on={p[1] === sel || undefined}
          aria-pressed={p[1] === sel}
          lang={greek ? "grc" : undefined}
          onPointerDown={() => setSel(p[1])}
          onClick={() => setSel(p[1])}
        >
          {p[0]}
        </button>
      );
      return punct ? (
        <span key={i} className={s.nowrap}>
          {word}
          {punct}
        </span>
      ) : (
        word
      );
    });

  return (
    <div className={s.demo}>
      <div className={s.demoBar}>
        <span>{ui.book} · {ui.version}</span>
        <span>{ui.hint}</span>
      </div>
      <div className={s.demoBody}>
        <div className={s.demoRead}>
          <p className={s.demoVerse}>
            <sup>1</sup>
            {render(VERSE[lang])}
          </p>
          <p className={s.demoGreek} lang="grc">{render(GREEK, true)}</p>
          <span className={s.demoVersion}>{ui.version} · SBLGNT</span>
        </div>
        <aside className={s.demoPanel} aria-live="polite">
          <div key={sel} className={s.demoSwap}>
            <p className={s.demoGreekBig} lang="grc">{lex.greek}</p>
            <p className={s.demoMeta}>
              {lex.translit} · {lex.strong}
            </p>
            <p className={s.demoGloss}>{lex.gloss}</p>
            <p className={s.demoNoteLabel}>{ui.note}</p>
            <p className={s.demoNote}>{lex.note}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
