-- Execute no SQL Editor depois do setup.sql.
-- RPCs do painel do lider.

create or replace function public.get_painel_lider()
returns json
language plpgsql security definer set search_path = public
as $$
declare resultado json;
declare perfil_atual public.profiles;
declare h public.huddles;
begin
  select * into perfil_atual
  from public.profiles
  where id = auth.uid() and ativo = true;

  if not found or perfil_atual.perfil not in ('LIDER', 'ADMIN') then
    raise exception 'Acesso permitido somente para lideres e administradores.';
  end if;

  select * into h
  from public.huddles
  where responsavel_id = auth.uid()
    and status in ('AGENDADO', 'EM_ANDAMENTO')
  order by criado_em desc
  limit 1;

  select json_build_object(
    'nome', perfil_atual.nome,
    'perfil', perfil_atual.perfil,
    'setor_id', perfil_atual.setor_id,
    'setor_nome', 'Todos os setores',
    'huddle_id', h.id,
    'codigo', h.codigo,
    'titulo', h.titulo,
    'status', h.status,
    'iniciado_em', h.iniciado_em,
    'expira_em', h.expira_em,
    'qr_payload', h.qr_payload,
    'total_esperado', (select count(*) from public.profiles p where p.ativo),
    'total_confirmado', (select count(*) from public.presencas p where p.huddle_id = h.id and p.confirmado_em is not null),
    'total_presentes', (select count(*) from public.presencas p where p.huddle_id = h.id and p.status = 'PRESENTE'),
    'total_atrasados', (select count(*) from public.presencas p where p.huddle_id = h.id and p.status = 'ATRASADO')
  ) into resultado;

  return resultado;
end;
$$;

grant execute on function public.get_painel_lider() to authenticated;

create or replace function public.criar_huddle_lider(
  p_duracao_minutos integer default 30,
  p_atraso_apos_minutos integer default 10
)
returns public.huddles
language plpgsql security definer set search_path = public
as $$
declare
  perfil_atual public.profiles;
  novo_huddle public.huddles;
  codigo_gerado text;
begin
  select * into perfil_atual
  from public.profiles
  where id = auth.uid() and ativo = true;

  if not found or perfil_atual.perfil not in ('LIDER', 'ADMIN') then
    raise exception 'Acesso permitido somente para lideres e administradores.';
  end if;

  if exists (
    select 1 from public.huddles
    where responsavel_id = auth.uid()
      and status in ('AGENDADO', 'EM_ANDAMENTO')
  ) then
    raise exception 'Voce ja possui um Huddle aberto.';
  end if;

  codigo_gerado := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.huddles (
    codigo,
    titulo,
    setor_id,
    responsavel_id,
    status,
    iniciado_em,
    expira_em,
    duracao_minutos,
    atraso_apos_minutos,
    qr_payload
  ) values (
    codigo_gerado,
    'Huddle diario',
    null,
    auth.uid(),
    'EM_ANDAMENTO',
    now(),
    now() + make_interval(mins => greatest(p_duracao_minutos, 1)),
    greatest(p_duracao_minutos, 1),
    greatest(p_atraso_apos_minutos, 0),
    'HUDDLE:' || gen_random_uuid()::text
  ) returning * into novo_huddle;

  return novo_huddle;
end;
$$;

grant execute on function public.criar_huddle_lider(integer, integer) to authenticated;

create or replace function public.encerrar_huddle_lider(p_huddle_id uuid)
returns public.huddles
language plpgsql security definer set search_path = public
as $$
declare encerrado public.huddles;
begin
  update public.huddles
  set status = 'ENCERRADO',
      encerrado_em = now()
  where id = p_huddle_id
    and responsavel_id = auth.uid()
    and status in ('AGENDADO', 'EM_ANDAMENTO')
  returning * into encerrado;

  if not found then
    raise exception 'Huddle nao encontrado ou sem permissao.';
  end if;

  return encerrado;
end;
$$;

grant execute on function public.encerrar_huddle_lider(uuid) to authenticated;
