import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInAction, signUpAction } from "./login/actions";
import { requestResetAction } from "./esqueci-senha/actions";
import { updatePasswordAction } from "./redefinir-senha/actions";

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(), signUp: vi.fn(), resetPasswordForEmail: vi.fn(),
  getUser: vi.fn(), updateUser: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ origin: "https://tally.example" }) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}
const credentials = () => form({ email: "test@example.com", password: "secret123" });
beforeEach(() => vi.resetAllMocks());

describe("mensagens de autenticação", () => {
  it.each([
    ["Invalid login credentials", "E-mail ou senha incorretos.", "password"],
    ["Email not confirmed", "Confirme o e-mail pelo link que enviamos.", "email"],
    ["Invalid email", "E-mail inválido.", "email"],
  ])("associa %s ao campo correto", async (message, error, field) => {
    auth.signInWithPassword.mockResolvedValue({ error: { message } });
    expect(await signInAction({ error: null }, credentials())).toEqual({ error, field });
  });
  it.each([
    ["User already registered", "Este e-mail já tem conta. Entre com a senha.", "email"],
    ["Password should be at least 6 characters", "A senha precisa ter pelo menos 6 caracteres.", "password"],
  ])("traduz %s no cadastro", async (message, error, field) => {
    auth.signUp.mockResolvedValue({ error: { message } });
    expect(await signUpAction({ error: null }, credentials())).toEqual({ error, field });
  });
});

describe("recuperação de senha", () => {
  it("usa o callback e mantém resposta neutra mesmo com erro do provedor", async () => {
    auth.resetPasswordForEmail.mockResolvedValueOnce({ error: null });
    const success = await requestResetAction({ message: null }, credentials());
    auth.resetPasswordForEmail.mockResolvedValueOnce({ error: { message: "rate limit" } });
    expect(await requestResetAction({ message: null }, credentials())).toEqual(success);
    expect(success.message).toBe("Se existir conta com esse e-mail, enviamos um link para redefinir a senha.");
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("test@example.com", {
      redirectTo: "https://tally.example/auth/callback?next=/redefinir-senha",
    });
  });
  it("rejeita senha curta e confirmação diferente sem alterar a conta", async () => {
    expect(await updatePasswordAction({ error: null }, form({ password: "123", confirm: "123" })))
      .toEqual({ error: "A senha precisa ter pelo menos 6 caracteres." });
    expect(await updatePasswordAction({ error: null }, form({ password: "secret123", confirm: "other123" })))
      .toEqual({ error: "As senhas não são iguais." });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it("impede alteração sem sessão e oferece recuperação", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null } });
    expect(await updatePasswordAction({ error: null }, form({ password: "secret123", confirm: "secret123" })))
      .toEqual({ error: "Link expirado. Peça um novo.", expired: true });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it("atualiza a senha da sessão e redireciona", async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: "test" } } });
    auth.updateUser.mockResolvedValue({ error: null });
    await expect(updatePasswordAction({ error: null }, form({ password: "secret123", confirm: "secret123" })))
      .rejects.toThrow("redirect:/");
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "secret123" });
  });
});
