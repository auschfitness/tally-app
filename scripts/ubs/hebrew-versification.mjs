// TAHOT traz referência do leitor e, entre parênteses, a referência massorética.
// Inclui Strong na chave para capítulos em que um versículo foi dividido.
const BOOK = Object.fromEntries("Gen:Gen Exo:Exod Lev:Lev Num:Num Deu:Deut Jos:Josh Jdg:Judg Rut:Ruth 1Sa:1Sam 2Sa:2Sam 1Ki:1Kgs 2Ki:2Kgs 1Ch:1Chr 2Ch:2Chr Ezr:Ezra Neh:Neh Est:Esth Job:Job Psa:Ps Pro:Prov Ecc:Eccl Sng:Song Isa:Isa Jer:Jer Lam:Lam Ezk:Ezek Dan:Dan Hos:Hos Joe:Joel Amo:Amos Oba:Obad Jon:Jonah Mic:Mic Nah:Nah Hab:Hab Zep:Zeph Hag:Hag Zec:Zech Mal:Mal".split(" ").map((s) => s.split(":")));

export function verseMapper(texts) {
  const changed = new Set();
  const targets = new Map();
  for (const text of texts) for (const line of text.split(/\r?\n/)) {
    const fields = line.split("\t");
    const m = fields[0].match(/^([1-2]?[A-Za-z]{3})\.(\d+)\.(\d+)(?:\((\d+)\.(\d+)\))?#/);
    if (!m || !BOOK[m[1]]) continue;
    const target = `${BOOK[m[1]]}.${Number(m[2])}.${Number(m[3])}`;
    const source = `${BOOK[m[1]]}.${Number(m[4] ?? m[2])}.${Number(m[5] ?? m[3])}`;
    if (source !== target) changed.add(source);
    for (const strong of new Set(fields[4]?.match(/H\d{4}/g) ?? [])) {
      const key = `${source}:${strong}`;
      if (!targets.has(key)) targets.set(key, new Set());
      targets.get(key).add(target);
    }
  }
  return (ref, strong) => {
    if (!changed.has(ref)) return ref;
    const matches = [...(targets.get(`${ref}:${strong}`) ?? [])].filter((r) => Number(r.split(".")[2]) > 0);
    // Sem correspondência ou mais de uma: não afirmar que o sentido é deste versículo.
    return matches.length === 1 ? matches[0] : null;
  };
}
