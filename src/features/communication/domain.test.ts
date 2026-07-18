import { describe, it, expect } from "vitest";
import {
  applyPlaceholder,
  audienceLabel,
  displayName,
  isSendable,
  messageStatusLabel,
  partitionByConsent,
  recipientStatusLabel,
  storableAudienceRef,
  summarizeSend,
  usesPlaceholder,
} from "./domain";
import type { Candidate } from "./types";

function cand(p: Partial<Candidate>): Candidate {
  return {
    stickId: "s",
    fullName: "Maria Silva",
    preferredName: "",
    email: "maria@ex.com",
    emailAllowed: true,
    ...p,
  };
}

describe("domain — nome e placeholder", () => {
  it("displayName usa apelido quando houver, senão o nome completo", () => {
    expect(displayName({ preferredName: "Bibi", fullName: "Beatriz Souza" })).toBe("Bibi");
    expect(displayName({ preferredName: "  ", fullName: "Beatriz Souza" })).toBe("Beatriz Souza");
    expect(displayName({ preferredName: null, fullName: "Beatriz Souza" })).toBe("Beatriz Souza");
  });

  it("applyPlaceholder troca todas as ocorrências de {nome}", () => {
    expect(applyPlaceholder("Olá {nome}, tudo bem, {nome}?", "Ana")).toBe("Olá Ana, tudo bem, Ana?");
    expect(applyPlaceholder("Sem placeholder", "Ana")).toBe("Sem placeholder");
  });

  it("usesPlaceholder detecta {nome}", () => {
    expect(usesPlaceholder("Oi {nome}")).toBe(true);
    expect(usesPlaceholder("Oi pessoal")).toBe(false);
  });
});

describe("domain — partição por consentimento", () => {
  it("separa quem recebe de quem é pulado, com motivo", () => {
    const { recipients, skipped } = partitionByConsent([
      cand({ stickId: "a", preferredName: "Ana", email: "ana@ex.com", emailAllowed: true }),
      cand({ stickId: "b", fullName: "Bruno", email: "", emailAllowed: true }),
      cand({ stickId: "c", fullName: "Cida", email: "cida@ex.com", emailAllowed: false }),
    ]);
    expect(recipients).toEqual([{ stickId: "a", name: "Ana", email: "ana@ex.com" }]);
    expect(skipped).toEqual([
      { stickId: "b", name: "Bruno", reason: "Sem e-mail" },
      { stickId: "c", name: "Cida", reason: "Não autoriza e-mail" },
    ]);
  });

  it("deduplica por Stick (não recebe duas vezes)", () => {
    const { recipients } = partitionByConsent([
      cand({ stickId: "a", email: "a@ex.com" }),
      cand({ stickId: "a", email: "a@ex.com" }),
    ]);
    expect(recipients).toHaveLength(1);
  });

  it("trata e-mail só com espaços como vazio", () => {
    const { recipients, skipped } = partitionByConsent([cand({ stickId: "a", email: "   ", emailAllowed: true })]);
    expect(recipients).toHaveLength(0);
    expect(skipped[0]!.reason).toBe("Sem e-mail");
  });
});

describe("domain — rótulos", () => {
  it("audienceLabel", () => {
    expect(audienceLabel("all")).toBe("Todos");
    expect(audienceLabel("care")).toBe("Cuidado");
    expect(audienceLabel("xpto")).toBe("Público");
  });
  it("status de mensagem e de destinatário", () => {
    expect(messageStatusLabel("queued")).toBe("Preparada");
    expect(messageStatusLabel("sent")).toBe("Enviada");
    expect(recipientStatusLabel("skipped")).toBe("Pulado");
    expect(recipientStatusLabel("pending")).toBe("Na fila");
  });
});

describe("domain — enviável (Enviar agora)", () => {
  it("é enviável só com pending>0 E status queued/sending/failed", () => {
    expect(isSendable("queued", 3)).toBe(true);
    expect(isSendable("sending", 1)).toBe(true);
    expect(isSendable("failed", 2)).toBe(true);
  });
  it("não é enviável sem destinatário na fila", () => {
    expect(isSendable("queued", 0)).toBe(false);
    expect(isSendable("failed", 0)).toBe(false);
  });
  it("não é enviável quando já enviada ou ainda rascunho", () => {
    expect(isSendable("sent", 5)).toBe(false);
    expect(isSendable("draft", 5)).toBe(false);
  });
});

describe("domain — resumo do envio", () => {
  it("soma enviados e falhados do processed", () => {
    expect(summarizeSend([{ message_id: "m", sent: 4, failed: 1 }])).toEqual({ sent: 4, failed: 1 });
    expect(
      summarizeSend([
        { message_id: "m1", sent: 2, failed: 0 },
        { message_id: "m2", sent: 1, failed: 3 },
      ]),
    ).toEqual({ sent: 3, failed: 3 });
  });
  it("processed vazio vira zero", () => {
    expect(summarizeSend([])).toEqual({ sent: 0, failed: 0 });
  });
});

describe("domain — audience_ref seguro", () => {
  it("grava só o necessário e NUNCA detalhe do Care", () => {
    expect(storableAudienceRef("group", { groupId: "g1" })).toEqual({ groupId: "g1" });
    expect(storableAudienceRef("signal", { signalType: "attendance", signalCategory: "Care" })).toEqual({
      signalType: "attendance",
      signalCategory: "Care",
    });
    expect(storableAudienceRef("manual", { stickIds: ["a", "b"] })).toEqual({ stickIds: ["a", "b"] });
    expect(storableAudienceRef("care", { stickIds: ["a"] })).toEqual({});
    expect(storableAudienceRef("all", {})).toEqual({});
  });
});
