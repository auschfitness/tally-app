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
import { viewSermons, mountSermonEditor } from "../views/sermons.js";
import { viewTeams } from "../views/teams.js";
import { viewServices } from "../views/services.js";
import { viewEvents } from "../views/events.js";
import { viewCalendar } from "../views/calendar.js";

export function render(){
  document.querySelectorAll(".navitem").forEach(n=>n.classList.toggle("active",n.dataset.view===state.view));
  document.getElementById("cnt-people").textContent=state.people.filter(inCampus).length;
  document.getElementById("cnt-tasks").textContent=state.tasks.filter(t=>!t.done).length;
  var _ib=document.getElementById("cnt-inbox");if(_ib)_ib.textContent=activeSignals().length;
  document.getElementById("instName").textContent=state.institution.name;
  const isw=document.getElementById("instsel");
  if(showInstSwitcher()){isw.style.display="flex";isw.innerHTML=state.institution.institutions.map(i=>'<button class="'+(i===state.institution.activeInstitution?'on':'')+'" data-inst="'+esc(i)+'">'+esc(i)+'</button>').join("");}else{isw.style.display="none";}
  document.getElementById("campus").innerHTML=state.institution.campuses.map(cp=>'<button class="'+(cp===state.activeCampus?'on':'')+'" data-campus="'+esc(cp)+'">'+esc(cp)+'</button>').join("");
  var _content=document.getElementById("content");
  _content.innerHTML=({dashboard:viewDashboard,people:viewPeople,coord:viewCoord,finance:viewFinance,settings:viewSettings,prayer:viewPrayer,groups:viewGroups,care:viewCare,journey:viewJourney,inbox:viewInbox,study:viewStudy,sermons:viewSermons,teams:viewTeams,services:viewServices,events:viewEvents,calendar:viewCalendar}[state.view])();
  // Transição de view (design-principles.md): re-dispara o fade+rise do conteúdo a cada render.
  _content.classList.remove("view-in");void _content.offsetWidth;_content.classList.add("view-in");
  if(state.view==="prayer"&&window.requestAnimationFrame)requestAnimationFrame(layoutPrayerCloud);
  if(state.view==="sermons"&&state.sermonEdit&&window.requestAnimationFrame)requestAnimationFrame(mountSermonEditor);
  if(window.requestAnimationFrame)requestAnimationFrame(renderCharts);
}
