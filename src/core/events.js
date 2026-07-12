// Wiring global: navegação do menu, tema, logout e os handlers de clique/mudança
// que são transversais (troca de campus/instituição, editar/marcar presença,
// tarefas, lançamentos, configurações e abrir os modais de "+"). Handlers
// específicos de cada tela vivem no módulo da própria tela.

import { state } from "./state.js";
import { save } from "./persist.js";
import { render } from "./render.js";
import { toggleTheme, setTheme } from "./theme.js";
import { SB } from "./session.js";
import { iso, today } from "./helpers.js";
import { upsertStick } from "./sticks-repo.js";
import { deleteEntry } from "./finance-repo.js";
import { renderCharts } from "../ui/charts.js";
import { closeModal } from "../ui/modal.js";
import { instArr } from "../views/settings.js";
import { personModal, checkinModal } from "../views/sticks.js";
import { postModal, taskModal } from "../views/coordination.js";
import { entryModal } from "../views/finance.js";

document.querySelectorAll(".navitem").forEach(n=>n.onclick=()=>{state.view=n.dataset.view;state.stickDetail=null;state.groupDetail=null;save();render();});
document.getElementById("themeBtn").onclick=toggleTheme;

var _lo=document.getElementById("logout");if(_lo)_lo.onclick=function(){if(SB)SB.auth.signOut().then(function(){location.reload();});};

document.addEventListener("click",e=>{const t=e.target;
  if(t.dataset.campus){state.activeCampus=t.dataset.campus;save();render();}
  if(t.dataset.inst){state.institution.activeInstitution=t.dataset.inst;save();render();}
  if(t.dataset.tab){state.settingsTab=t.dataset.tab;save();render();}
  if(t.dataset.seen){const p=state.people.find(x=>x.id===t.dataset.seen);if(p){p.lastSeen=iso(today());p.followup=false;upsertStick(p);save();render();}}
  if(t.dataset.edit){const p=state.people.find(x=>x.id===t.dataset.edit);if(p)personModal(p);}
  if(t.dataset.toggle){const x=state.tasks.find(z=>z.id===t.dataset.toggle);if(x){x.done=!x.done;save();render();}}
  if(t.dataset.deltask){state.tasks=state.tasks.filter(z=>z.id!==t.dataset.deltask);save();render();}
  if(t.dataset.delentry){deleteEntry(t.dataset.delentry);state.entries=state.entries.filter(z=>z.id!==t.dataset.delentry);save();render();}
  if(t.dataset.rm){const arr=instArr(t.dataset.rm);const i=arr.indexOf(t.dataset.val);if(i>=0)arr.splice(i,1);if(!state.institution.campuses.includes(state.activeCampus))state.activeCampus=state.institution.campuses[0]||"";save();render();}
  if(t.dataset.add){const v=(prompt("Adicionar:")||"").trim();if(v){const arr=instArr(t.dataset.add);if(!arr.includes(v))arr.push(v);save();render();}}
  if(t.id==="sw-multi"){state.institution.multiInstitution=!state.institution.multiInstitution;save();render();}
  if(t.id==="checkinBtn")checkinModal();
  if(t.id==="addPost")postModal();
  if(t.id==="addTask")taskModal();
  if(t.id==="addEntry")entryModal();
  if(t.id==="ov")closeModal();
});
document.addEventListener("change",e=>{const id=e.target.id,v=e.target.value;
  if(id==="careWeeks"){state.careWeeks=parseInt(v);save();render();}
  if(id==="set-currency"){state.institution.currency=v;save();render();}
  if(id==="set-inst-name"){state.institution.name=v.trim()||state.institution.name;save();render();}
  if(id==="set-acc-name"){state.account.name=v.trim();save();}
  if(id==="set-lang"){state.account.language=v;save();}
  if(id==="set-theme"){setTheme(v);}
  if(id==="set-tz"){state.account.timezone=v;save();}
});
window.addEventListener("load",function(){renderCharts();});
