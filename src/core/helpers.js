// Utilidades puras (sem estado): datas, texto, rótulos e pequenos construtores
// de HTML que só dependem dos seus argumentos. Nada aqui lê o `state`.

export const uid = () => Math.random().toString(36).slice(2, 9);
export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const daysAgo = n => { const d = today(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
export const iso = d => d.toISOString().slice(0, 10);
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function weeksSince(s) { if (!s) return 999; const diff = (today() - new Date(s)) / (1000 * 60 * 60 * 24); return Math.floor(diff / 7); }
export function agoLabel(s) { if (!s) return "nunca"; const d = Math.round((today() - new Date(s)) / (1000 * 60 * 60 * 24)); if (d <= 0) return "hoje"; if (d < 7) return "há " + d + " dia" + (d > 1 ? "s" : ""); const w = Math.floor(d / 7); return "há " + w + " semana" + (w > 1 ? "s" : ""); }
export const initials = n => n.split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase();
export function isThisMonth(s) { const d = new Date(s), n = today(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }
export function ageOf(p) { if (!p.birthDate) return null; return Math.floor((today() - new Date(p.birthDate)) / (1000 * 60 * 60 * 24 * 365.25)); }

// Relação (tipo de vínculo da pessoa com a igreja)
export var REL = { visitor_first: "Visitante 1a vez", visitor_returning: "Visitante recorrente", attendee: "Frequentador", member: "Membro", inactive: "Inativo" };
export var REL_SHORT = { visitor_first: "Visitante", visitor_returning: "Visitante", attendee: "Frequentador", member: "Membro", inactive: "Inativo" };
export function relLabel(p) { return REL_SHORT[p.relationship] || "—"; }
export function relLabelFull(p) { return REL[p.relationship] || "—"; }
export function isLeader(p) { return (p.roles || []).indexOf("leader") >= 0; }
export function relCls(p) { return p.relationship === "member" ? "member" : "visitor"; }

// Journey (estágios da caminhada da pessoa na igreja)
export var JOURNEY = [["first_visit", "Primeira visita"], ["returned", "Retornou"], ["connected", "Conectado"], ["group", "Em grupo"], ["serving", "Servindo"], ["leadership", "Liderança"]];
export function journeyIndex(s) { for (var i = 0; i < JOURNEY.length; i++) { if (JOURNEY[i][0] === s) return i; } return 0; }
export function journeyLabel(s) { for (var i = 0; i < JOURNEY.length; i++) { if (JOURNEY[i][0] === s) return JOURNEY[i][1]; } return "—"; }
export function journeySnap(p) { var idx = journeyIndex(p.journeyStage); return '<div class="jsnap">' + JOURNEY.map(function (j, i) { var cls = i < idx ? "done" : (i === idx ? "cur" : ""); return '<div class="jstep ' + cls + '"><div class="jdot"></div><span>' + j[1] + '</span></div>'; }).join("") + '</div>'; }
export function attStrip(p) { var w = Math.min(12, weeksSince(p.lastSeen)); var out = ""; for (var i = 11; i >= 0; i--) { out += '<div class="wk ' + ((i < w) ? "absent" : "present") + '"></div>'; } return '<div class="wkstrip">' + out + '</div>'; }

// Milestones (marcos)
export var MSTYPE = { first_visit: "Primeira visita", second_visit: "Segunda visita", conversion: "Conversão", baptism: "Batismo", joined_group: "Entrou em um grupo", started_serving: "Começou a servir", completed_track: "Concluiu trilha", membership: "Tornou-se membro", leadership: "Tornou-se líder", returned: "Retornou após ausência", prayer_answered: "Oração respondida" };

export function timelineHtml(ev) { if (!ev.length) return '<div class="empty">Nenhuma história registrada ainda.</div>'; var out = "", curM = ""; ev.forEach(function (e) { var d = new Date(e.date); var mk = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][d.getMonth()] + " " + d.getFullYear(); if (mk !== curM) { out += '<div class="tlm">' + mk + '</div>'; curM = mk; } out += '<div class="tlrow ' + e.type + '"><div class="td">' + d.getDate() + '</div><div class="tt">' + esc(e.title) + '</div>' + (e.sub ? '<div class="ts">' + esc(e.sub) + '</div>' : '') + '</div>'; }); return out; }

// Paleta usada nos gráficos de finanças e na legenda de despesas
export var FINPAL = ["#2B5CE6", "#1FA97A", "#E8833A", "#EA5B4C", "#8b74e8", "#3E9AB0", "#B0663E", "#6B7688"];
