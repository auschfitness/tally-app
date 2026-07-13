// Render central: atualiza o topo/menu (contadores, seletor de instituição e
// campus) e injeta a tela atual no #content. Depois agenda gráficos e o layout
// da nuvem de oração para o próximo frame.

import { state } from "./state.js";
import { esc } from "./helpers.js";
import { inCampus, activeSignals, showInstSwitcher } from "./derived.js";
import { renderCharts } from "../ui/charts.js";
import { viewDashboard } from "../views/home.js";
import { viewPeople } from "../views/sticks.js";
import { viewCoord } from "../views/coordination.js";
import { viewFinance } from "../views/finance.js";
import { viewSettings } from "../views/settings.js";
import { viewPrayer, layoutPrayerCloud } from "../views/prayer.js";
import { viewGroups } from "../views/groups.js";
import { viewCare } from "../views/care.js";
import { viewJourney } from "../views/journey.js";
import { viewInbox } from "../views/inbox.js";
import { viewStudy } from "../views/study.js";

export function render(){
  document.querySelectorAll(".navitem").forEach(n=>n.classList.toggle("active",n.dataset.view===state.view));
  document.getElementById("cnt-people").textContent=state.people.filter(inCampus).length;
  document.getElementById("cnt-tasks").textContent=state.tasks.filter(t=>!t.done).length;
  var _ib=document.getElementById("cnt-inbox");if(_ib)_ib.textContent=activeSignals().length;
  document.getElementById("instName").textContent=state.institution.name;
  const isw=document.getElementById("instsel");
  if(showInstSwitcher()){isw.style.display="flex";isw.innerHTML=state.institution.institutions.map(i=>'<button class="'+(i===state.institution.activeInstitution?'on':'')+'" data-inst="'+esc(i)+'">'+esc(i)+'</button>').join("");}else{isw.style.display="none";}
  document.getElementById("campus").innerHTML=state.institution.campuses.map(cp=>'<button class="'+(cp===state.activeCampus?'on':'')+'" data-campus="'+esc(cp)+'">'+esc(cp)+'</button>').join("");
  document.getElementById("content").innerHTML=({dashboard:viewDashboard,people:viewPeople,coord:viewCoord,finance:viewFinance,settings:viewSettings,prayer:viewPrayer,groups:viewGroups,care:viewCare,journey:viewJourney,inbox:viewInbox,study:viewStudy}[state.view])();
  if(state.view==="prayer"&&window.requestAnimationFrame)requestAnimationFrame(layoutPrayerCloud);
  if(window.requestAnimationFrame)requestAnimationFrame(renderCharts);
}
