// Persistência: salva o estado no Supabase (tabela app_state), com "debounce"
// de 400ms para não gravar a cada tecla. Sem org/sem cliente, não faz nada.

import { SB, ORG_ID, USER } from "./session.js";
import { state } from "./state.js";

let _saveTimer = null;
export function save(){if(!ORG_ID||!SB)return;clearTimeout(_saveTimer);_saveTimer=setTimeout(function(){SB.from("app_state").upsert({org_id:ORG_ID,data:state,updated_at:new Date().toISOString(),updated_by:USER?USER.id:null}).then(function(r){if(r&&r.error)console.warn("save error",r.error.message);});},400);}
