# Comentários de João em português (lote NN)

Entrada: `scripts/comments/work/batch-NN.input.json` = `[{ id, source, chapter, verse, kind, text }]`
(`jfb` = Jamieson-Fausset-Brown, domínio público; `tyn` = Tyndale, CC BY-SA 4.0). Textos em inglês.
Saída: `scripts/comments/work/batch-NN.pt.json` = `[{ id, text_pt }]`, um item por entrada, mesma ordem, mesmos `id`.

Regras:
- Traduzir À MÃO, o bloco inteiro. PROIBIDO gerar por script (recortar, dicionário automático). O validador pega.
- Português do Brasil, tom de comentário bíblico, fiel ao autor. Não resumir, não acrescentar, não opinar.
- Manter a estrutura: mesmos parágrafos (linha em branco entre eles) e mesmas quebras de linha do original.
- Referências bíblicas no formato brasileiro com ponto: "Jo 1.2", "1Co 8.6", "Mt 5.3-5", "Gn 28.12". O JFB escreve "Joh 1:2", "Co1 8:6", "Jo1 1:2" (1 João); converta todas. Siglas: Mt, Mc, Lc, Jo, At, Rm, 1Co, 2Co, Gl, Ef, Fp, Cl, 1Ts, 2Ts, 1Tm, 2Tm, Tt, Fm, Hb, Tg, 1Pe, 2Pe, 1Jo, 2Jo, 3Jo, Jd, Ap, Gn, Êx, Lv, Nm, Dt, Js, Jz, Rt, 1Sm, 2Sm, 1Rs, 2Rs, 1Cr, 2Cr, Ed, Ne, Et, Jó, Sl, Pv, Ec, Ct, Is, Jr, Lm, Ez, Dn, Os, Jl, Am, Ob, Jn, Mq, Na, Hc, Sf, Ag, Zc, Ml.
- "&c." vira "etc.". Nada de travessão longo (— ou –): use vírgula, ponto ou hífen. Sem emoji.
- Nomes próprios no nome usual em português ("Pedro", "Jerusalém", "Natanael"). Nomes de autores citados em CAIXA ALTA no JFB (CALVINO, BENGEL, OLSHAUSEN) ficam como estão.
- Palavras gregas/hebraicas em letras latinas ou no original: manter como no texto.
- Citação bíblica no texto: usar a redação de uma Bíblia em português (Almeida/Bíblia Livre), não retraduzir do inglês.
- O JFB usa " -- " como pausa: troque por vírgula, dois-pontos ou ponto, conforme o sentido.

Ao terminar, rode `node scripts/comments/validate-comments.mjs NN` e corrija até dar `ok`.
