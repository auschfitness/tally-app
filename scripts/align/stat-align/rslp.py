"""Stemmer RSLP (Orengo & Huyck, 2001) em Python puro, sem dependências.

Sete passos, nesta ordem: plural, feminino, advérbio, aumentativo/diminutivo, sufixo de
substantivo; se este não tirou nada, sufixo de verbo; se nenhum dos dois tirou, remoção da
vogal final. Cada regra: (sufixo, tamanho mínimo do radical que sobra, troca, exceções).
Escrito a partir da descrição publicada do algoritmo; as listas de exceções são enxutas, o que
só importa para conflar palavras que o original separaria.

Teste: python scripts/align/stat-align/rslp.py
"""

PLURAL = [
    ("ns", 1, "m", ()), ("ões", 3, "ão", ()), ("ães", 1, "ão", ("mães",)),
    ("ais", 1, "al", ("cais", "mais")), ("éis", 2, "el", ()), ("eis", 2, "el", ()), ("óis", 2, "ol", ()),
    ("is", 2, "il", ("lápis", "cais", "mais", "crúcis", "biquínis", "pois", "depois", "dois", "leis")),
    ("les", 3, "l", ()), ("res", 3, "r", ()),
    ("s", 2, "", ("aliás", "pires", "lápis", "cais", "mais", "mas", "menos", "férias", "fezes", "pêsames",
                  "crúcis", "gás", "atrás", "moisés", "através", "convés", "ês", "país", "após", "ambas",
                  "ambos", "messias")),
]

FEMININE = [
    ("ona", 3, "ão", ("abandona", "lona", "iona", "cortisona", "monótona", "maratona", "acetona", "detona", "carona")),
    ("ora", 3, "or", ()),
    ("na", 4, "no", ("carona", "abandona", "lona", "iona", "cortisona", "monótona", "maratona", "acetona", "detona", "paranoica")),
    ("inha", 3, "inho", ("rainha", "linha", "minha")),
    ("esa", 3, "ês", ("mesa", "obesa", "princesa", "turquesa", "ilesa", "pesa", "presa")),
    ("osa", 3, "oso", ("mucosa", "prosa")),
    ("íaca", 3, "íaco", ()), ("ica", 3, "ico", ("dica",)), ("ada", 2, "ado", ("pelada",)),
    ("ida", 3, "ido", ("vida",)), ("ída", 3, "ído", ("recaída", "saída")), ("ima", 3, "imo", ("vítima",)),
    ("iva", 3, "ivo", ("saliva", "oliva")),
    ("eira", 3, "eiro", ("beira", "cadeira", "frigideira", "bandeira", "feira", "capoeira", "barreira", "fronteira", "besteira", "poeira")),
    ("ã", 2, "ão", ("amanhã", "arapuã", "fã", "divã")),
]

ADVERB = [("mente", 4, "", ("experimente",))]

AUGMENTATIVE = [
    ("díssimo", 5, "", ()), ("abilíssimo", 5, "", ()), ("íssimo", 3, "", ()), ("ésimo", 3, "", ()),
    ("érrimo", 4, "", ()), ("zinho", 2, "", ()), ("quinho", 4, "c", ()), ("uinho", 4, "", ()),
    ("adinho", 3, "", ()), ("inho", 3, "", ("caminho", "cominho")), ("alhão", 4, "", ()), ("uça", 4, "", ()),
    ("aço", 4, "", ("antebraço",)), ("aça", 4, "", ()), ("adão", 4, "", ()), ("idão", 4, "", ()),
    ("ázio", 3, "", ("topázio",)), ("arraz", 4, "", ()), ("zarrão", 3, "", ()), ("arrão", 4, "", ()),
    ("arra", 3, "", ()), ("zão", 2, "", ("coalizão",)),
    ("ão", 3, "", ("acórdão", "alemão", "bastão", "irmão", "órfão", "órgão", "capitão", "cristão", "pagão",
                   "sacristão", "escrivão", "coração", "oração", "paixão", "visão", "razão", "cidadão")),
]

NOUN = [
    ("encialista", 4, "", ()), ("alista", 5, "", ()), ("agem", 3, "", ("coragem", "chantagem", "vantagem", "carruagem")),
    ("iamento", 4, "", ()), ("amento", 3, "", ()), ("imento", 3, "", ()),
    ("mento", 6, "", ("firmamento", "fundamento", "departamento")), ("alizado", 4, "", ()),
    ("atizado", 4, "", ()), ("tizado", 4, "", ()), ("izado", 5, "", ("organizado", "pulverizado")),
    ("ativo", 4, "", ("pejorativo", "relativo")), ("tivo", 4, "", ("relativo",)),
    ("ivo", 4, "", ("passivo", "possessivo", "pejorativo", "positivo")),
    ("ado", 4, "", ("grado",)), ("ido", 4, "", ("cândido", "consolido", "rápido", "decido", "tímido", "duvido", "marido")),
    ("ador", 3, "", ()), ("edor", 3, "", ()), ("idor", 4, "", ("ouvidor",)), ("dor", 4, "", ()),
    ("sor", 4, "", ("assessor",)), ("atoria", 5, "", ()), ("tor", 3, "", ("setor",)), ("or", 2, "", ("anterior", "inferior", "interior", "melhor", "pior", "superior", "ulterior")),
    ("abilidade", 5, "", ()), ("icionista", 4, "", ()), ("cionista", 5, "", ()), ("ional", 4, "", ()),
    ("ência", 3, "", ()), ("ância", 4, "", ("ambulância", "arrogância", "distância")), ("edouro", 3, "", ()),
    ("queiro", 3, "c", ()), ("adeiro", 4, "", ("desfiladeiro",)), ("eiro", 3, "", ("desfiladeiro", "pioneiro", "mosteiro")),
    ("uoso", 3, "", ()), ("oso", 3, "", ("precioso",)),
    ("alizaç", 5, "", ()), ("atizaç", 5, "", ()), ("tizaç", 5, "", ()), ("izaç", 5, "", ("organizaç",)),
    ("ção", 3, "", ()), ("aç", 3, "", ()), ("iç", 3, "", ("eleiç",)),
    ("ário", 3, "", ("voluntário", "salário", "aniversário", "diário", "armário")), ("atório", 3, "", ()),
    ("rio", 5, "", ("agreste",)), ("ério", 6, "", ()), ("êncio", 5, "", ()),
    ("ente", 4, "", ("freqüente", "alimente", "acrescente", "permanente", "oriente", "aparente")), ("ante", 2, "", ()),
    ("ismo", 3, "", ("cinismo",)), ("ista", 3, "", ()), ("ável", 2, "", ()), ("ível", 3, "", ()),
    ("ico", 4, "", ("selvático",)), ("ura", 4, "", ("imatura", "acupuntura", "costura")),
    ("ez", 4, "", ()), ("eza", 4, "", ()), ("ice", 4, "", ("cúmplice",)), ("al", 4, "", ("afinal", "animal", "estatal", "bem-estar", "talvez", "hospital", "pessoal", "jornal")),
]

VERB = [
    ("aríamo", 2, "", ()), ("ássemo", 2, "", ()), ("eríamo", 2, "", ()), ("êssemo", 2, "", ()),
    ("iríamo", 3, "", ()), ("íssemo", 3, "", ()), ("áramo", 2, "", ()), ("árei", 2, "", ()), ("aremo", 2, "", ()),
    ("ariam", 2, "", ()), ("aríei", 2, "", ()), ("ássei", 2, "", ()), ("assem", 2, "", ()), ("ávamo", 2, "", ()),
    ("êramo", 3, "", ()), ("eremo", 3, "", ()), ("eriam", 3, "", ()), ("eríei", 3, "", ()), ("êssei", 3, "", ()),
    ("essem", 3, "", ()), ("íramo", 3, "", ()), ("iremo", 3, "", ()), ("iriam", 3, "", ()), ("iríei", 3, "", ()),
    ("íssei", 3, "", ()), ("issem", 3, "", ()), ("ando", 2, "", ()), ("endo", 3, "", ()), ("indo", 3, "", ()),
    ("ondo", 3, "", ()), ("aram", 2, "", ()), ("arão", 2, "", ()), ("arde", 2, "", ()), ("arei", 2, "", ()),
    ("arem", 2, "", ()), ("aria", 2, "", ()), ("armo", 2, "", ()), ("asse", 2, "", ()), ("aste", 2, "", ()),
    ("avam", 2, "", ()), ("ávei", 2, "", ()), ("eram", 3, "", ()), ("erão", 3, "", ()), ("erde", 3, "", ()),
    ("erei", 3, "", ()), ("êrei", 3, "", ()), ("erem", 3, "", ()), ("eria", 3, "", ()), ("ermo", 3, "", ()),
    ("esse", 3, "", ()), ("este", 3, "", ("faroeste", "agreste")), ("íamo", 3, "", ()), ("iram", 3, "", ()),
    ("íram", 3, "", ()), ("irão", 2, "", ()), ("irde", 2, "", ()), ("irei", 3, "", ("admirei",)), ("irem", 3, "", ()),
    ("iria", 3, "", ()), ("irmo", 3, "", ()), ("isse", 3, "", ()), ("iste", 4, "", ()), ("iam", 3, "", ()),
    ("ado", 2, "", ()), ("ido", 3, "", ()), ("ará", 2, "", ()), ("ara", 2, "", ()), ("ava", 2, "", ()),
    ("ar", 2, "", ()), ("er", 2, "", ()), ("ir", 3, "", ()), ("am", 2, "", ()), ("em", 2, "", ()),
    ("ou", 3, "", ()), ("ei", 3, "", ("lei", "rei")), ("eu", 3, "", ()), ("iu", 3, "", ()), ("ia", 3, "", ()),
    ("á", 3, "", ()), ("ê", 3, "", ("bebê",)),
]

VOWEL = [
    ("bil", 2, "vel", ()), ("gue", 2, "g", ("gangue", "jegue")),
    ("á", 3, "", ("amá",)), ("ê", 3, "", ("bebê", "pontapé")),
    ("a", 3, "", ("ásia",)), ("e", 3, "", ()), ("o", 3, "", ("ão",)),
]


def _step(word: str, rules) -> str:
    """Aplica a primeira regra que casa (sufixo, radical mínimo, fora das exceções)."""
    for suffix, min_stem, repl, exceptions in rules:
        if word.endswith(suffix) and len(word) - len(suffix) >= min_stem and word not in exceptions:
            return word[: len(word) - len(suffix)] + repl
    return word


def stem(word: str) -> str:
    w = word.lower()
    w = _step(w, PLURAL)
    w = _step(w, FEMININE)
    w = _step(w, ADVERB)
    w = _step(w, AUGMENTATIVE)
    before = w
    w = _step(w, NOUN)
    if w == before:
        w = _step(w, VERB)
        if w == before:
            w = _step(w, VOWEL)
    return w


if __name__ == "__main__":
    same = [["testemunhava", "testemunhou", "testemunho", "testemunhar", "testemunhavam"],
            ["estava", "estavam", "estavas"], ["falava", "falou", "falavam"], ["viu", "viram"]]
    for group in same:
        stems = {stem(x) for x in group}
        print(group, "->", stems)
    assert len({stem(x) for x in same[0]}) == 1, "testemunh* deveria virar um radical só"
    assert stem("palavras") == stem("palavra")
    print("ok")
