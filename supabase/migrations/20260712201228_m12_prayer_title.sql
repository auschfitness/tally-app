alter table public.prayer_requests
  add column if not exists title text;

comment on column public.prayer_requests.title is 'Nome/título curto do pedido (exibido em negrito no card). Nullable; pedidos antigos podem não ter.';
