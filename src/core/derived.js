// Camada de inteligência: tudo que é CALCULADO a partir do estado —
// motivos de cuidado, saúde dos grupos, Signals, Timeline, séries de
// frequência e finanças, nuvem de oração. É o coração do "um pastor vê o um".

import { state } from "./state.js";
import { save } from "./persist.js";
import { weeksSince, agoLabel, iso, today, esc, MSTYPE, relLabel, relCls, isLeader, JOURNEY } from "./helpers.js";
import { deletePrayer } from "./prayer-repo.js";

export function careReasons(p){const r=[];if(weeksSince(p.lastSeen)>=state.careWeeks)r.push({t:agoLabel(p.lastSeen),full:"Sem aparecer "+agoLabel(p.lastSeen)});if(!p.group)r.push({t:"sem grupo",full:"Ainda não está em um grupo"});if(p.followup)r.push({t:"follow-up",full:"Follow-up em aberto"});return r;}
export const inCampus=p=>p.campus===state.activeCampus;
export const unaccounted=()=>state.people.filter(p=>inCampus(p)&&careReasons(p).length>0);
export function allFunds(){const s=new Set(state.institution.funds);state.entries.forEach(e=>s.add(e.fund));return[...s];}
export function showInstSwitcher(){return state.institution.multiInstitution&&state.account.role==="owner";}

export function relChip(p){if(careReasons(p).length>0)return '<span class="chip care">Atenção</span>';return '<span class="chip '+relCls(p)+'">'+relLabel(p)+'</span>'+(isLeader(p)?' <span class="chip leader">Líder</span>':'');}

export function groupOptions(sel){var o='<option value="">(nenhum)</option>';(state.groups||[]).forEach(function(g){o+='<option '+(sel===g.name?'selected':'')+'>'+esc(g.name)+'</option>';});return o;}
export function groupsHealth(){
  var gs=(state.groups||[]).filter(function(g){return g.campus===state.activeCampus;});
  return gs.map(function(g){var members=state.people.filter(function(p){return p.group===g.name&&p.campus===state.activeCampus;});var acc=members.filter(function(p){return careReasons(p).length===0;}).length;var rate=members.length?Math.round(acc/members.length*100):0;var band=members.length===0?"attention":(rate>=85?"healthy":(rate>=70?"attention":"risk"));var gm=(state.groupMembers&&state.groupMembers[g.name])||{};return {name:g.name,leader:g.leader,count:members.length,acc:acc,rate:rate,band:band,newMembers:gm.newMembers||0,leftRecently:gm.leftRecently||0,noLeader:!g.leader};}).sort(function(a,b){return a.rate-b.rate;});
}

export function riskDist(){var em=0,at=0,ri=0;state.people.filter(inCampus).forEach(function(p){var n=careReasons(p).length;if(n===0)em++;else if(n===1)at++;else ri++;});return {em:em,at:at,ri:ri};}

export function attendanceSeries(){
  var members=state.people.filter(inCampus).filter(function(p){return p.relationship&&p.relationship.indexOf("visitor")!==0;}).length||18;
  var base=Math.max(8,Math.round(members*0.82));var factors=[1.0,1.03,0.99,1.05,1.02,0.86,0.9,0.98];var labels=[],data=[];
  for(var i=7;i>=0;i--){var d=new Date();d.setDate(d.getDate()-i*7);labels.push(d.getDate()+"/"+(d.getMonth()+1));}
  factors.forEach(function(f){data.push(Math.round(base*f));});return {labels:labels,data:data};
}

export function financeMonthly(){
  var ce=state.entries.filter(function(e){return e.campus===state.activeCampus;});
  var months=[],labels=[];var now=today();var mn=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  for(var i=5;i>=0;i--){var dd=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(dd.getFullYear()+"-"+String(dd.getMonth()+1).padStart(2,"0"));labels.push(mn[dd.getMonth()]);}
  var inc=[0,0,0,0,0,0],exp=[0,0,0,0,0,0];
  ce.forEach(function(e){var idx=months.indexOf((e.date||"").slice(0,7));if(idx>=0){if(e.type==="in")inc[idx]+=e.amount;else exp[idx]+=e.amount;}});
  var baseIn=inc[5]||7550,baseEx=exp[5]||4080;var f=[0.82,0.9,1.18,0.95,1.06,1.0];
  for(var j=0;j<6;j++){if(inc[j]===0)inc[j]=Math.round(baseIn*f[j]);if(exp[j]===0)exp[j]=Math.round(baseEx*f[j]*0.98);}
  return {labels:labels,inc:inc,exp:exp};
}
export function expenseByCat(){var m={};state.entries.filter(function(e){return e.campus===state.activeCampus&&e.type==="out";}).forEach(function(e){m[e.cat]=(m[e.cat]||0)+e.amount;});return Object.keys(m).map(function(k){return {cat:k,val:m[k]};}).sort(function(a,b){return b.val-a.val;});}

export function prayerCloudData(){
  var all=(state.prayers||[]).filter(function(p){return !p.answered;});var m={};
  function add(text,cat){var k=cat+"|"+text;if(!m[k])m[k]={text:text,cat:cat,count:0};m[k].count++;}
  all.forEach(function(p){(p.topics||[]).forEach(function(tp){add(tp,"topic");});if(p.group)add(p.group,"group");if(p.author&&p.author!=="Anônimo")add(p.author,"name");});
  var arr=Object.keys(m).map(function(k){return m[k];});
  arr.sort(function(a,b){return b.count-a.count;});
  return arr.slice(0,28);
}
export function prayerMatch(p,f){if(!f)return true;if(f.cat==="topic")return (p.topics||[]).indexOf(f.val)>=0;if(f.cat==="group")return p.group===f.val;if(f.cat==="name")return p.author===f.val;return true;}
export function prunePrayers(){var t=today();var b=state.prayers.length;var gone=[];state.prayers=state.prayers.filter(function(p){if(!p.answered||!p.answeredDate)return true;var keep=(t-new Date(p.answeredDate))/(1000*60*60*24)<30;if(!keep)gone.push(p.id);return keep;});if(state.prayers.length!==b){gone.forEach(function(id){deletePrayer(id);});save();}}
export function ansLeft(p){if(!p.answeredDate)return"";var d=Math.ceil(30-(today()-new Date(p.answeredDate))/(1000*60*60*24));return d>0?("some em "+d+" dia"+(d>1?"s":"")):"some em breve";}

// --- Journey analytics (Step 4 · Fase 2) — SÓ dados reais, nunca inventados. ---
// STUCK_DAYS: dias no mesmo estágio a partir dos quais consideramos "parado".
export var STUCK_DAYS=30;
// Distribuição por estágio no campus ativo: contagem, tempo médio no estágio
// (de entered_stage_at) e quantos estão parados. avgDays=null quando não há
// registro relacional carregado (ex.: dev/sem login) — a UI mostra "—".
export function journeyStats(){
  var ppl=(state.people||[]).filter(inCampus).filter(function(p){return !p.archived;});
  var recs=(state.journey&&state.journey.records)||{};var t=today();
  return JOURNEY.map(function(j,i){
    var inStage=ppl.filter(function(p){return p.journeyStage===j[0];});
    var days=inStage.map(function(p){var r=recs[p.id];if(!r||!r.enteredAt)return null;return Math.floor((t-new Date(r.enteredAt))/(1000*60*60*24));}).filter(function(x){return x!=null;});
    var avg=days.length?Math.round(days.reduce(function(a,b){return a+b;},0)/days.length):null;
    var stuck=days.filter(function(d){return d>=STUCK_DAYS;}).length;
    return {code:j[0],label:j[1],pos:i+1,count:inStage.length,avgDays:avg,stuck:stuck,people:inStage};
  });
}
// Funil cumulativo: quantos "alcançaram" cada estágio (jornada é monotônica, então
// quem está numa posição passou pelas anteriores). Revela onde está a maior queda.
export function journeyFunnel(){
  var stats=journeyStats();var acc=0;var out=[];
  for(var i=stats.length-1;i>=0;i--){acc+=stats[i].count;out[i]={label:stats[i].label,reached:acc};}
  return out.map(function(row,i){var prev=i>0?out[i-1].reached:row.reached;var drop=prev>0?Math.round((1-row.reached/prev)*100):0;return {label:row.label,reached:row.reached,dropFromPrev:i>0?drop:null};});
}
// Evasão 1ª → 2ª visita, dos milestones reais (quem veio uma vez e não voltou).
export function journeyFirstVisitDrop(){
  var ppl=(state.people||[]).filter(inCampus);
  var came=ppl.filter(function(p){return (p.milestones||[]).some(function(m){return m.type==="first_visit";});});
  var returned=came.filter(function(p){return (p.milestones||[]).some(function(m){return m.type==="second_visit";});});
  return {came:came.length,returned:returned.length,lost:came.length-returned.length};
}
// Movimento por mês (mudanças de estágio) dos últimos `months`, de timeline_events.
// Vem quase vazio no começo (o histórico mal começou) — e tudo bem: é real.
export function journeyMovement(months){
  months=months||6;var evs=(state.journey&&state.journey.events)||[];
  var d=new Date(iso(today())+"T00:00:00");var buckets=[];var idx={};
  for(var k=months-1;k>=0;k--){var dt=new Date(d.getFullYear(),d.getMonth()-k,1);var key=dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0");var lbl=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][dt.getMonth()];idx[key]=buckets.length;buckets.push({key:key,label:lbl,count:0});}
  evs.forEach(function(e){var mk=(e.occurredAt||"").slice(0,7);if(idx[mk]!=null)buckets[idx[mk]].count++;});
  return buckets;
}

// --- Community Insights (Step 4 · Fase 6) — só padrões com dado real. ---
// Conexão (quem está em grupo), pessoas sem comunidade, grupos sem novatos/sem
// líder, e movimento de jornada dos últimos 30 dias. Sem grafo, sem inventar.
export function communityInsights(){
  var ppl=(state.people||[]).filter(inCampus).filter(function(p){return !p.archived;});
  var noGroup=ppl.filter(function(p){return !p.group;});
  var inGroup=ppl.length-noGroup.length;
  var connRate=ppl.length?Math.round(inGroup/ppl.length*100):0;
  var groups=(typeof groupsHealth==="function")?groupsHealth():[];
  var groupsNoNew=groups.filter(function(g){return (g.newMembers||0)===0;});
  var groupsNoLeader=groups.filter(function(g){return g.noLeader;});
  var t=today();
  var evs=(state.journey&&state.journey.events)?state.journey.events:[];
  var movement30=evs.filter(function(e){return e.occurredAt&&(t-new Date(e.occurredAt))/(1000*60*60*24)<=30;}).length;
  return {total:ppl.length,inGroup:inGroup,noGroup:noGroup,connRate:connRate,groups:groups,groupsNoNew:groupsNoNew,groupsNoLeader:groupsNoLeader,movement30:movement30};
}

export function stickBy(id){return (state.people||[]).find(function(p){return p.id===id;});}
export function householdOf(p){if(!p.household)return null;return (state.households||[]).find(function(h){return h.name===p.household;});}
export function stickTimeline(p){
  var ev=[];
  (p.milestones||[]).forEach(function(m){ev.push({date:m.date,type:"milestone",title:MSTYPE[m.type]||m.type,sub:""});});
  (state.sessions||[]).forEach(function(s){if((s.attendees||[]).indexOf(p.id)>=0)ev.push({date:s.date,type:"attendance",title:"Presente no culto",sub:s.campus});});
  (state.prayers||[]).forEach(function(pr){if(pr.author===p.name){var open=pr.privacy==="church";ev.push({date:pr.date,type:"prayer",title:open?"Pedido de oração":"Contexto pastoral atualizado",sub:open?pr.request:"Visibilidade restrita"});if(pr.answered&&pr.answeredDate)ev.push({date:pr.answeredDate,type:"milestone",title:"Oração respondida",sub:""});}});
  var cr=careReasons(p);if(cr.length)ev.push({date:iso(today()),type:"care",title:"Tally notou uma mudança",sub:cr.map(function(r){return r.full;}).join(" · ")});
  ev.sort(function(a,b){return b.date.localeCompare(a.date);});return ev;
}

export function signals(){
  var out=[];
  state.people.filter(inCampus).forEach(function(p){
    var w=weeksSince(p.lastSeen);
    if(w>=3){out.push({key:"att-"+p.id,type:"attendance",level:"attention",stickId:p.id,stickName:p.name,title:p.name+" pode precisar de atenção",why:["Sem aparecer há "+w+" semanas"].concat(!p.group?["Não está em um grupo"]:[]).concat(p.followup?["Follow-up em aberto"]:[]),date:iso(today()),category:"Care"});}
    else if(!p.group&&(p.relationship==="visitor_first"||p.relationship==="visitor_returning")){out.push({key:"grp-"+p.id,type:"journey",level:"notice",stickId:p.id,stickName:p.name,title:p.name+" ainda não entrou em um grupo",why:["Visitante sem grupo"],date:iso(today()),category:"Journey"});}
    else if(p.followup){out.push({key:"fu-"+p.id,type:"care",level:"attention",stickId:p.id,stickName:p.name,title:p.name+" tem follow-up em aberto",why:["Follow-up pendente"],date:iso(today()),category:"Care"});}
    (p.milestones||[]).forEach(function(m){var dd=Math.round((today()-new Date(m.date))/(1000*60*60*24));if(dd>=0&&dd<=21)out.push({key:"ms-"+p.id+"-"+m.type,type:"milestone",level:"celebration",stickId:p.id,stickName:p.name,title:p.name+" · "+(MSTYPE[m.type]||m.type),why:[],date:m.date,category:"Celebration"});});
  });
  (typeof groupsHealth==="function"?groupsHealth():[]).forEach(function(g){
    if(g.band==="risk")out.push({key:"gh-"+g.name,type:"group_health",level:"attention",groupName:g.name,title:"Grupo "+g.name+" com saúde baixa",why:[g.rate+"% dos membros em dia"],date:iso(today()),category:"Groups"});
    // Group Signals (Fase 4) — só dado real. "Sem líder atribuído" (g.leader vazio;
    // não afirmamos "atividade do líder"). Novos membros e saídas vêm de group_members.
    if(g.noLeader)out.push({key:"gl-"+g.name,type:"group_leader",level:"notice",groupName:g.name,title:"Grupo "+g.name+" sem líder atribuído",why:["Nenhum líder definido"],date:iso(today()),category:"Groups"});
    if(g.newMembers>0)out.push({key:"gn-"+g.name,type:"group_growth",level:"celebration",groupName:g.name,title:"Grupo "+g.name+" recebeu "+g.newMembers+" novo"+(g.newMembers>1?"s":"")+" membro"+(g.newMembers>1?"s":""),why:[],date:iso(today()),category:"Groups"});
    if(g.leftRecently>0)out.push({key:"gx-"+g.name,type:"group_movement",level:"attention",groupName:g.name,title:"Grupo "+g.name+": "+g.leftRecently+" saída"+(g.leftRecently>1?"s":"")+" recente"+(g.leftRecently>1?"s":""),why:[],date:iso(today()),category:"Groups"});
    // Sinal de presença de grupo (destravado nesta fase): só p/ grupo que JÁ registrou
    // presença mas parou (>21 dias). Grupo que nunca registrou NÃO é sinalizado (evita
    // flood e número inventado). "Presença caiu" (tendência) fica p/ quando houver histórico.
    var gss=(state.sessions||[]).filter(function(s){return s.group===g.name;});
    if(gss.length>0){var last=gss.map(function(s){return s.date||"";}).sort().pop();var dd=Math.round((today()-new Date(last))/(1000*60*60*24));if(dd>21)out.push({key:"ga-"+g.name,type:"group_attendance",level:"attention",groupName:g.name,title:"Grupo "+g.name+" sem registro de presença",why:["Última presença há "+dd+" dias"],date:iso(today()),category:"Groups"});}
  });
  state.tasks.filter(function(t){return !t.done&&t.who;}).forEach(function(t){out.push({key:"task-"+t.id,type:"team",level:"notice",title:esc(t.who)+" foi designado: "+esc(t.text),why:[],date:iso(today()),category:"Teams",stickName:t.who});});
  out=out.concat(serviceSignals());
  out=out.concat(serviceEventSignals());
  return out;
}

// --- Signals de Cultos & Eventos (Step 6 · Fase 6, §10) — só dado real. Alimentam
// Inbox (categoria Cultos) e Home. Presença que caiu, visitante para acompanhar,
// escala sem cobertura, evento próximo, presença recorde. Nunca score. ---
export function serviceEventSignals(){
  var out=[];
  var t=today();
  var svcs=(state.services||[]).filter(function(s){return s.active!==false&&(!s.campus||s.campus===state.activeCampus);});
  svcs.forEach(function(s){
    var sess=(state.sessions||[]).filter(function(x){return x.service===s.id;}).slice().sort(function(a,b){return (a.date||"").localeCompare(b.date||"");});
    if(sess.length>=3){
      var counts=sess.map(function(x){return (x.attendees||[]).length;});
      var latest=counts[counts.length-1];
      var prev=counts.slice(Math.max(0,counts.length-4),counts.length-1);
      var avg=prev.reduce(function(a,b){return a+b;},0)/prev.length;
      if(avg>0&&latest<avg*0.8){
        var pct=Math.round((1-latest/avg)*100);
        out.push({key:"svc-drop-"+s.id,type:"service_attendance",level:"attention",title:"Presença caiu em "+s.name,why:["Última: "+latest+" · média recente: "+Math.round(avg)+" (−"+pct+"%)"],date:iso(t),category:"Services"});
      }
      if(latest>0&&latest===Math.max.apply(null,counts)){
        out.push({key:"svc-record-"+s.id+"-"+latest,type:"service_attendance",level:"celebration",title:s.name+" teve a maior presença registrada",why:[latest+" presentes"],date:sess[sess.length-1].date||iso(t),category:"Celebration"});
      }
    }
    // Visitantes no último culto → oportunidade de follow-up (§10 · Journey).
    if(sess.length){
      var last=sess[sess.length-1];
      var vis=(last.attendees||[]).filter(function(aid){var p=(state.people||[]).find(function(x){return x.id===aid;});return p&&p.relationship&&p.relationship.indexOf("visitor")===0;}).length;
      if(vis>0){
        out.push({key:"svc-vis-"+s.id+"-"+(last.date||""),type:"service_visitor",level:"notice",title:vis+" visitante"+(vis>1?"s":"")+" no último "+s.name,why:["Acompanhe o follow-up e a Journey"],date:last.date||iso(t),category:"Services"});
      }
    }
  });

  // Escala sem cobertura (precisa de substituto / recusada) numa data futura.
  var teamNames={}; (state.teams||[]).forEach(function(tm){teamNames[tm.id]=tm.name;});
  var need=(state.schedule||[]).filter(function(a){return a.assignment_date&&a.assignment_date>=iso(t)&&(a.status==="replacement_needed"||a.status==="declined");});
  if(need.length){
    out.push({key:"svc-cover",type:"service_coverage",level:"attention",title:need.length+" escalação"+(need.length>1?"ões":"")+" sem cobertura",why:["Alguém recusou ou pediu substituto"],date:iso(t),category:"Services"});
  }

  // Evento próximo (até 14 dias) — lembrete operacional.
  (state.events||[]).forEach(function(e){
    if(e.status!=="active"||!e.event_date||(e.campus&&e.campus!==state.activeCampus))return;
    var dd=Math.round((new Date(e.event_date+"T00:00:00")-t)/(1000*60*60*24));
    if(dd>=0&&dd<=14){
      var regs=(state.eventRegs||[]).filter(function(r){return r.event_id===e.id;}).length;
      out.push({key:"evt-soon-"+e.id,type:"event_upcoming",level:"notice",title:e.name+(dd===0?" é hoje":(dd===1?" é amanhã":" em "+dd+" dias")),why:[regs+" inscrito"+(regs!==1?"s":"")+(e.capacity?" de "+e.capacity:"")],date:iso(t),category:"Services"});
    }
  });
  return out;
}

// --- Signals de serviço (Step 7 · Fase 5, §9/§20/§10/§21) — só dado real. Alimentam
// Inbox (categorias Serviço/Care) e Home. Nada de score; contexto e oportunidade. ---
function weekNum(dateIso){ return Math.floor(new Date(dateIso+"T00:00:00").getTime()/(7*86400000)); }
function consecutiveWeekStreak(dates){
  var weeks={}; dates.forEach(function(d){ weeks[weekNum(d)]=1; });
  var curW=Math.floor(today().getTime()/(7*86400000));
  var served=Object.keys(weeks).map(Number).filter(function(w){return w<=curW;}).sort(function(a,b){return b-a;});
  if(!served.length) return 0;
  var streak=0,w=served[0]; while(weeks[w]){ streak++; w--; } return streak;
}
export function serviceSignals(){
  var out=[];
  var teams=(state.teams||[]).filter(function(t){return t.status==="active"&&(t.campus===state.activeCampus||!t.campus);});
  var actByTeam={}; (state.teamMembers||[]).forEach(function(m){ if(m.status==="active"){(actByTeam[m.team_id]||(actByTeam[m.team_id]=[])).push(m);} });
  var servingIds={}; (state.teamMembers||[]).forEach(function(m){ if(m.status==="active") servingIds[m.stick_id]=1; });

  teams.forEach(function(t){
    var act=actByTeam[t.id]||[];
    if(act.length===0) out.push({key:"tm-empty-"+t.id,type:"team_health",level:"attention",title:"Time "+t.name+" está sem ninguém servindo",why:["Nenhuma pessoa ativa no time"],date:iso(today()),category:"Teams"});
    else if(act.length<=3) out.push({key:"tm-few-"+t.id,type:"team_health",level:"attention",title:"Time "+t.name+" depende de poucas pessoas",why:[act.length+" pessoa"+(act.length>1?"s":"")+" servindo"],date:iso(today()),category:"Teams"});
    if(!t.leader_id) out.push({key:"tm-noleader-"+t.id,type:"team_health",level:"notice",title:"Time "+t.name+" sem líder",why:["Nenhum líder definido"],date:iso(today()),category:"Teams"});
  });

  // Oportunidade (§20): conectados (em grupo) que ainda não servem.
  var cns=(state.people||[]).filter(inCampus).filter(function(p){return !p.archived&&p.group&&!servingIds[p.id];});
  if(cns.length) out.push({key:"tm-connns",type:"serving_opportunity",level:"notice",title:cns.length+" pessoa"+(cns.length>1?"s":"")+" conectada"+(cns.length>1?"s":"")+" ainda não serve"+(cns.length>1?"m":""),why:["Estão em grupo, mas não em nenhum time"],date:iso(today()),category:"Teams"});

  // Começou a servir (§10): joined_at recente → sugere marcar Journey 'Servindo' (humano confirma).
  (state.teamMembers||[]).forEach(function(m){
    if(m.status!=="active"||!m.joined_at) return;
    var dd=Math.round((today()-new Date(m.joined_at))/(1000*60*60*24)); if(dd<0||dd>21) return;
    var p=(state.people||[]).find(function(x){return x.id===m.stick_id;}); if(!p||!inCampus(p)) return;
    var t=(state.teams||[]).find(function(x){return x.id===m.team_id;});
    out.push({key:"tm-start-"+m.id,type:"serving_start",level:"celebration",stickId:p.id,stickName:p.name,title:p.name+" começou a servir"+(t?" em "+t.name:""),why:["Considere marcar como Servindo na Journey"],date:m.joined_at,category:"Teams"});
  });

  // Cuidado (§21): quem serve há muitas semanas seguidas — atenção ao cansaço.
  var byStick={}; (state.schedule||[]).forEach(function(a){ if(a.stick_id&&a.assignment_date)(byStick[a.stick_id]||(byStick[a.stick_id]=[])).push(a.assignment_date); });
  Object.keys(byStick).forEach(function(sid){
    var streak=consecutiveWeekStreak(byStick[sid]); if(streak<10) return;
    var p=(state.people||[]).find(function(x){return x.id===sid;}); if(!p||!inCampus(p)) return;
    out.push({key:"tm-streak-"+sid,type:"serving_care",level:"notice",stickId:p.id,stickName:p.name,title:p.name+" serve há "+streak+" semanas seguidas",why:["Atenção ao descanso — evite o cansaço"],date:iso(today()),category:"Care"});
  });
  return out;
}
export function sigStatus(k){var o=(state.signalOverrides||{})[k];return o?o.status:"new";}
export function setSig(k,st){if(!state.signalOverrides)state.signalOverrides={};state.signalOverrides[k]=Object.assign({},state.signalOverrides[k]||{},{status:st});save();}
export function activeSignals(){return signals().filter(function(s){return sigStatus(s.key)!=="dismissed";});}
export function signalsFor(id){return activeSignals().filter(function(s){return s.stickId===id;});}
