// Opção leve de pessoa para selects (id + nome). Evita passar a Person inteira aos
// Client Components (dados serializáveis mínimos do servidor).
export interface PersonOption {
  id: string;
  name: string;
}
