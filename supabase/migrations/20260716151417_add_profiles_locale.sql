alter table public.profiles
  add column if not exists locale text not null default 'pt-BR'
  check (locale in ('pt-BR','en','es'));

comment on column public.profiles.locale is
  'Idioma preferido do usuário (i18n). Valores: pt-BR (padrão), en, es. Editável pelo próprio usuário via RLS prof_update.';
