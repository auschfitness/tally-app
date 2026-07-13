// Fonte do texto bíblico (Step 5 · Fase 3) — PLUGÁVEL. O texto NÃO fica no nosso
// banco; vem sob demanda da Free Use Bible API (helloao): grátis, sem chave, uso
// comercial liberado, JSON, 1000+ traduções. Encapsulado aqui para depois somar
// outras fontes (A Bíblia Digital, upload do usuário) sem reescrever a UI.
//
// Endpoints (verificados):
//   /api/available_translations.json
//   /api/{translation}/{book}/{chapter}.json  (book = código USFM: GEN, JHN, 1CO)
// O JSON do capítulo traz um array de itens; os versículos são {type:'verse', number, content:[...]}.
// Erros de rede/CORS são tratados com estado honesto (ok:false) — a UI mostra aviso.

var BASE = "https://bible.helloao.org/api";
var _translations = null;   // promise (cache)
var _chapterCache = {};      // key tr/book/chap → promise

function versesFrom(data) {
  var arr = (data && data.chapter && data.chapter.content) || (data && data.content) || [];
  if (!Array.isArray(arr)) return [];
  return arr.filter(function (x) { return x && x.type === "verse"; });
}
function verseText(v) {
  var parts = (v.content || []).map(function (seg) {
    if (typeof seg === "string") return seg;
    if (seg && typeof seg.text === "string") return seg.text;
    return "";
  });
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

// Lista de traduções disponíveis (cache). Cada item: {id, language, name, englishName, shortName}.
export function listTranslations() {
  if (_translations) return _translations;
  _translations = fetch(BASE + "/available_translations.json")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(function (data) {
      var arr = (data && (data.translations || data.data)) || (Array.isArray(data) ? data : []);
      return arr.map(function (t) {
        return { id: t.id, language: t.language || "", name: t.name || t.englishName || t.id, englishName: t.englishName || t.name || t.id, shortName: t.shortName || t.id };
      });
    })
    .catch(function (e) { _translations = null; throw e; });
  return _translations;
}

// Escolhe uma tradução padrão: prefere Português; senão a Berean (BSB, domínio
// público); senão a primeira. Nunca lança (devolve null se a lista falhar).
export function defaultTranslation() {
  return listTranslations().then(function (list) {
    if (!list || !list.length) return null;
    var pt = list.filter(function (t) { return (t.language || "").toLowerCase().indexOf("por") === 0; });
    if (pt.length) return pt[0];
    var bsb = list.filter(function (t) { return t.id === "BSB"; });
    if (bsb.length) return bsb[0];
    return list[0];
  }).catch(function () { return null; });
}

// Busca o texto de uma passagem numa tradução. Devolve {ok, translationId, verses:[{n,text}], text}
// ou {ok:false, error}. `ref` = {book(code), chapter, verse_start, verse_end}.
export function fetchPassage(ref, translationId) {
  if (!ref || !ref.book || !ref.chapter) return Promise.resolve({ ok: false, error: "Referência inválida." });
  var tr = translationId;
  var start = tr ? Promise.resolve(tr) : defaultTranslation().then(function (d) { return d && d.id; });
  return start.then(function (trId) {
    if (!trId) return { ok: false, error: "Nenhuma tradução disponível agora." };
    var key = trId + "/" + ref.book + "/" + ref.chapter;
    if (!_chapterCache[key]) {
      _chapterCache[key] = fetch(BASE + "/" + trId + "/" + ref.book + "/" + ref.chapter + ".json")
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .catch(function (e) { delete _chapterCache[key]; throw e; });
    }
    return _chapterCache[key].then(function (data) {
      var all = versesFrom(data);
      var vs = ref.verse_start, ve = ref.verse_end || ref.verse_start;
      var picked = all.filter(function (v) {
        if (!vs) return true;                 // capítulo inteiro
        return v.number >= vs && v.number <= ve;
      }).map(function (v) { return { n: v.number, text: verseText(v) }; });
      if (!picked.length) return { ok: false, error: "Passagem não encontrada nesta tradução.", translationId: trId };
      return { ok: true, translationId: trId, verses: picked, text: picked.map(function (p) { return p.text; }).join(" ") };
    });
  }).catch(function () {
    return { ok: false, error: "Não foi possível carregar a versão agora." };
  });
}
