import { describe, expect, it } from "vitest";
import { boletoCode, fileProblem } from "./files";

describe("boletoCode", () => {
  it("acha a linha digitável bancária (47) com pontos e espaços", () => {
    expect(boletoCode("Pagar até sexta\n23793.38128 60000.000003 00000.000400 1 84340000012345")).toBe("23793381286000000000300000000400184340000012345");
  });
  it("acha a de convênio (48)", () => {
    expect(boletoCode("836200000015 123401380003 123456789012 345678901234")).toHaveLength(48);
  });
  it("ignora números que não são boleto", () => {
    expect(boletoCode("Pix: 12.345.678/0001-90, tel 48 99999-0000")).toBeNull();
    expect(boletoCode("")).toBeNull();
  });
});

describe("fileProblem", () => {
  it("aceita PDF e foto até 10 MB", () => {
    expect(fileProblem("application/pdf", 1000)).toBeNull();
    expect(fileProblem("image/heic", 10 * 1024 * 1024)).toBeNull();
  });
  it("recusa tipo estranho e arquivo grande", () => {
    expect(fileProblem("application/zip", 10)).not.toBeNull();
    expect(fileProblem("image/png", 10 * 1024 * 1024 + 1)).not.toBeNull();
  });
});
