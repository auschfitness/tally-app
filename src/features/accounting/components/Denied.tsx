// Estado "sem acesso" da Contabilidade (área sensível: finance.manage). Server Component
// puro — a barreira real é o RLS (m48); isto só dá o recado claro a quem não pode.
export function Denied() {
  return (
    <>
      <h1 className="page">Contabilidade</h1>
      <div className="panel" style={{ marginTop: 16 }}>
        <div className="empty" style={{ lineHeight: 1.6 }}>
          Esta área é restrita ao tesoureiro e ao dono.
          <br />
          <span className="muted">Dado financeiro é sensível — peça acesso a quem administra as finanças da igreja.</span>
        </div>
      </div>
    </>
  );
}
