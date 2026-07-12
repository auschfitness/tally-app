// Formatação de dinheiro. Depende da moeda da instituição (state).

import { state } from "./state.js";

export function money(n){const cur=state.institution.currency;const loc=cur==="USD"?"en-US":"pt-BR";return new Intl.NumberFormat(loc,{style:"currency",currency:cur}).format(n||0);}
export function moneyShort(n){var cur=state.institution.currency==="USD"?"$":"R$";var a=Math.abs(n);if(a>=1000)return cur+" "+(n/1000).toFixed(a>=10000?0:1).replace(".0","")+"k";return cur+" "+Math.round(n);}
