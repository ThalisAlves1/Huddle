-- Torna o Huddle unico e visivel para todos os setores.
-- Execute no SQL Editor depois do setup.sql.

alter table public.huddles
  alter column setor_id drop not null;

create or replace function public.get_home_colaborador()
returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'nome', p.nome,
    'matricula', p.matricula,
    'perfil', p.perfil,
    'setor_id', p.setor_id,
    'setor_nome', s.nome,
    'huddle_id', h.id,
    'huddle_codigo', h.codigo,
    'huddle_titulo', h.titulo,
    'huddle_status', h.status,
    'huddle_data', h.data_local,
    'iniciado_em', h.iniciado_em,
    'atraso_apos', h.iniciado_em,
    'expira_em', h.expira_em,
    'presenca_id', pr.id,
    'presenca_status', pr.status,
    'confirmado_em', pr.confirmado_em
  )
  from public.profiles p
  left join public.setores s on s.id = p.setor_id
  left join lateral (
    select * from public.huddles h0
    where h0.status in ('AGENDADO', 'EM_ANDAMENTO')
    order by h0.criado_em desc
    limit 1
  ) h on true
  left join public.presencas pr on pr.huddle_id = h.id and pr.user_id = p.id
  where p.id = auth.uid();
$$;

grant execute on function public.get_home_colaborador() to authenticated;

-- Depois deste arquivo, execute novamente leader-rpcs.sql.
