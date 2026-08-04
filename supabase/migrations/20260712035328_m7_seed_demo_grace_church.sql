
do $$
declare
  v_org uuid; v_mck uuid; v_anna uuid;
  v_marcos uuid; v_beatriz uuid; v_ruth uuid; v_daniel uuid; v_lea uuid;
  v_pedro uuid; v_sara uuid; v_joao uuid; v_clara uuid; v_lucas uuid;
  v_celula uuid; v_jovens uuid; v_mulheres uuid; v_casais uuid; v_louvor uuid; v_kids uuid;
  v_hh uuid; v_sess uuid;
  function_dummy int;
begin
  insert into organizations(name,currency) values ('Grace Church','BRL') returning id into v_org;
  insert into campuses(org_id,name) values (v_org,'McKinney') returning id into v_mck;
  insert into campuses(org_id,name) values (v_org,'Anna North') returning id into v_anna;

  insert into journey_stages(org_id,name,position) values
    (v_org,'Primeira visita',1),(v_org,'Retornou',2),(v_org,'Conectado',3),
    (v_org,'Em grupo',4),(v_org,'Servindo',5),(v_org,'Liderança',6);

  insert into milestone_types(org_id,code,name,is_system,auto) values
    (v_org,'first_visit','Primeira visita',true,true),
    (v_org,'second_visit','Segunda visita',true,true),
    (v_org,'conversion','Conversão',true,false),
    (v_org,'baptism','Batismo',true,false),
    (v_org,'joined_group','Entrou em um grupo',true,true),
    (v_org,'started_serving','Começou a servir',true,true),
    (v_org,'membership','Tornou-se membro',true,false),
    (v_org,'leadership','Tornou-se líder',true,false),
    (v_org,'returned','Retornou após ausência',true,true),
    (v_org,'prayer_answered','Oração respondida',true,true);

  insert into roles(org_id,name,permissions,is_system) values
    (v_org,'Owner','{}',true),
    (v_org,'Pastor',array['sticks.edit','care.view','care.manage','prayer.view_private','prayer.manage','groups.manage_all'],true),
    (v_org,'Care Team',array['sticks.edit','care.view'],true),
    (v_org,'Treasurer',array['finance.manage'],true),
    (v_org,'Group Leader',array['groups.manage_assigned'],true),
    (v_org,'Member','{}',true);

  insert into funds(org_id,name) values (v_org,'Geral'),(v_org,'Missões'),(v_org,'Construção'),(v_org,'Social');
  insert into finance_categories(org_id,type,name) values
    (v_org,'in','Dízimo'),(v_org,'in','Oferta'),(v_org,'in','Doação'),(v_org,'in','Campanha'),
    (v_org,'out','Aluguel'),(v_org,'out','Utilidades'),(v_org,'out','Salários'),
    (v_org,'out','Missões'),(v_org,'out','Ação social'),(v_org,'out','Eventos'),(v_org,'out','Manutenção');

  insert into sticks(org_id,primary_campus_id,full_name,relationship_status,is_leader,journey_stage_id,first_visit_date,last_seen_at,source)
   values (v_org,v_mck,'Marcos Vieira','member',true,(select id from journey_stages where org_id=v_org and name='Liderança'),'2019-03-10',current_date-2,'Amigo/família') returning id into v_marcos;
  insert into sticks(org_id,primary_campus_id,full_name,relationship_status,is_leader,journey_stage_id,first_visit_date,last_seen_at,source)
   values (v_org,v_mck,'Beatriz Rocha','member',true,(select id from journey_stages where org_id=v_org and name='Servindo'),'2021-05-02',current_date-3,'Evento') returning id into v_beatriz;
  insert into sticks(org_id,primary_campus_id,full_name,relationship_status,journey_stage_id,first_visit_date,last_seen_at,source)
   values (v_org,v_mck,'Ruth Alves','member',(select id from journey_stages where org_id=v_org and name='Em grupo'),'2026-01-12',current_date-24,'Amigo/família') returning id into v_ruth;
  insert into sticks(org_id,primary_campus_id,full_name,relationship_status,journey_stage_id,first_visit_date,last_seen_at,source)
   values (v_org,v_mck,'Daniel Melo','visitor_returning',(select id from journey_stages where org_id=v_org and name='Retornou'),current_date-28,current_date-14,'Google') returning id into v_daniel;
  insert into sticks(org_id,primary_campus_id,full_name,relationship_status,journey_stage_id,first_visit_date,last_seen_at,followup_open,source)
   values (v_org,v_mck,'Lea Santos','member',(select id from journey_stages where org_id=v_org and name='Conectado'),current_date-60,current_date-4,true,'Redes sociais') returning id into v_lea;
  insert into sticks(org_id,primary_campus_id,full_name,relationship_status,is_leader,journey_stage_id,first_visit_date,last_seen_at,source)
   values (v_org,v_mck,'Pedro Almeida','member',true,(select id from journey_stages where org_id=v_org and name='Liderança'),'2018-08-19',current_date-3,'Amigo/família') returning id into v_pedro;
  insert into sticks(org_id,primary_campus_id,full_name,relationship_status,journey_stage_id,birth_date,first_visit_date,last_seen_at,source)
   values (v_org,v_mck,'Lucas Alves','member',(select id from journey_stages where org_id=v_org and name='Conectado'),'2016-05-01','2026-01-12',current_date-2,'Amigo/família') returning id into v_lucas;
  insert into sticks(org_id,primary_campus_id,full_name,relationship_status,journey_stage_id,first_visit_date,last_seen_at,source)
   values (v_org,v_anna,'Sara Nunes','visitor_first',(select id from journey_stages where org_id=v_org and name='Primeira visita'),current_date-9,current_date-9,'Website') returning id into v_sara;
  insert into sticks(org_id,primary_campus_id,full_name,relationship_status,is_leader,journey_stage_id,first_visit_date,last_seen_at,source)
   values (v_org,v_anna,'João Prado','member',true,(select id from journey_stages where org_id=v_org and name='Servindo'),'2020-02-16',current_date-31,'Amigo/família') returning id into v_joao;
  insert into sticks(org_id,primary_campus_id,full_name,relationship_status,is_leader,journey_stage_id,first_visit_date,last_seen_at,source)
   values (v_org,v_anna,'Clara Dias','member',true,(select id from journey_stages where org_id=v_org and name='Servindo'),'2022-07-01',current_date-2,'Evento') returning id into v_clara;

  insert into households(org_id,name,campus_id) values (v_org,'Família Alves',v_mck) returning id into v_hh;
  insert into household_members(household_id,stick_id,relationship_type,is_primary_contact) values
    (v_hh,v_ruth,'adult',true),(v_hh,v_lucas,'child',false);

  insert into groups(org_id,campus_id,name,meeting_day,meeting_time) values (v_org,v_mck,'Célula Norte','Quarta','20h') returning id into v_celula;
  insert into groups(org_id,campus_id,name,meeting_day,meeting_time) values (v_org,v_mck,'Jovens','Sábado','19h') returning id into v_jovens;
  insert into groups(org_id,campus_id,name,meeting_day,meeting_time) values (v_org,v_mck,'Mulheres','Terça','15h') returning id into v_mulheres;
  insert into groups(org_id,campus_id,name,meeting_day,meeting_time) values (v_org,v_mck,'Casais','Domingo','18h') returning id into v_casais;
  insert into groups(org_id,campus_id,name,meeting_day,meeting_time) values (v_org,v_anna,'Louvor','Sábado','16h') returning id into v_louvor;
  insert into groups(org_id,campus_id,name,meeting_day,meeting_time) values (v_org,v_anna,'Kids','Domingo','09h') returning id into v_kids;

  insert into group_members(group_id,stick_id,role) values
    (v_celula,v_marcos,'leader'),(v_jovens,v_beatriz,'leader'),(v_mulheres,v_ruth,'member'),
    (v_casais,v_pedro,'leader'),(v_louvor,v_joao,'leader'),(v_kids,v_clara,'leader');

  insert into attendance_sessions(org_id,context_type,context_id,campus_id,title,session_date)
   values (v_org,'service',null,v_mck,'Culto de Domingo',current_date-3) returning id into v_sess;
  insert into attendance_records(session_id,stick_id,status) values
    (v_sess,v_marcos,'present'),(v_sess,v_beatriz,'present'),(v_sess,v_pedro,'present'),(v_sess,v_lea,'present'),(v_sess,v_lucas,'present');

  insert into milestones(org_id,stick_id,code,occurred_on,title) values
    (v_org,v_ruth,'first_visit','2026-01-12','Primeira visita'),
    (v_org,v_ruth,'second_visit','2026-01-19','Segunda visita'),
    (v_org,v_ruth,'joined_group','2026-02-03','Entrou em um grupo'),
    (v_org,v_lea,'conversion',current_date-40,'Conversão');

  insert into prayer_requests(org_id,campus_id,stick_id,author_name,request,topics,privacy,group_id,praying_count) values
    (v_org,v_mck,v_ruth,'Ruth Alves','Peço oração pela saúde da minha mãe, cirurgia na quinta.',array['saúde','família'],'church',v_mulheres,8),
    (v_org,v_mck,v_pedro,'Pedro Almeida','Paz e cura para o meu casamento.',array['paz','cura','casamento'],'leader',v_casais,3);

  insert into finance_entries(org_id,campus_id,type,description,category_name,fund_name,amount,entry_date) values
    (v_org,v_mck,'in','Dízimos de domingo','Dízimo','Geral',4200,current_date-3),
    (v_org,v_mck,'in','Ofertas','Oferta','Geral',1350,current_date-3),
    (v_org,v_mck,'out','Aluguel do salão','Aluguel','Geral',2500,current_date-5),
    (v_org,v_mck,'out','Cestas básicas','Ação social','Social',900,current_date-2);

  insert into signals(org_id,campus_id,type,category,title,priority,status,related_stick_id,metadata) values
    (v_org,v_mck,'attendance','Care','Ruth Alves pode precisar de atenção','attention','new',v_ruth,'{"why":["Sem aparecer há 3 semanas"]}'),
    (v_org,v_anna,'attendance','Care','João Prado pode precisar de atenção','attention','new',v_joao,'{"why":["Sem aparecer há 4 semanas"]}');
end $$;
