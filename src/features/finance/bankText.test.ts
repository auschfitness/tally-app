import { describe, expect, it } from "vitest";
import { cleanMemo, donorFromLine } from "./bankText";

describe("cleanMemo", () => {
  it("tira o ruído do banco e deixa legível", () => {
    expect(cleanMemo("PIX ENVIADO IMOBILIARIA SOL ALUGUEL SET")).toBe("Imobiliaria Sol Aluguel Set");
    expect(cleanMemo("DEB AUTOMATICO VIVO FIBRA")).toBe("Vivo Fibra");
    expect(cleanMemo("DEPOSITO OFERTAS CULTO DE DOMINGO")).toBe("Ofertas Culto de Domingo");
    expect(cleanMemo("TARIFA PACOTE SERVICOS")).toBe("Tarifa Pacote Servicos");
  });
  it("não mexe no que a pessoa digitou nem apaga tudo", () => {
    expect(cleanMemo("Ofertas do culto")).toBe("Ofertas do culto");
    expect(cleanMemo("PIX")).toBe("Pix");
    expect(cleanMemo("")).toBe("");
  });
});

describe("donorFromLine", () => {
  const people = [
    { id: "m1", name: "Maria Silva Oliveira" },
    { id: "j1", name: "João Pedro" },
  ];
  it("acha a pessoa cadastrada pelo primeiro e último nome", () => {
    expect(donorFromLine({ amount: 2000, description: "PIX RECEBIDO MARIA S OLIVEIRA DOACAO" }, people)).toEqual({ stickId: "m1", name: "Maria Silva Oliveira" });
  });
  it("sem cadastro, usa o nome do extrato", () => {
    expect(donorFromLine({ amount: 350, description: "PIX RECEBIDO ANA P COSTA" }, people)).toEqual({ stickId: null, name: "Ana P. Costa" });
  });
  it("não inventa pessoa", () => {
    expect(donorFromLine({ amount: 5230, description: "PIX RECEBIDO DIZIMOS CULTO DOMINGO" }, people)).toBeNull();
    expect(donorFromLine({ amount: 1310, description: "DEPOSITO OFERTAS CULTO DOMINGO" }, people)).toBeNull();
    expect(donorFromLine({ amount: -50, description: "PIX ENVIADO JOAO PEDRO" }, people)).toBeNull();
    expect(donorFromLine({ amount: 80, description: "PIX RECEBIDO MERCADO BOM LTDA" }, people)).toBeNull();
  });
});
