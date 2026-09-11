-- Execute este arquivo no SQL Editor se as tabelas do setup.sql ja existem.

create or replace function public.usuario_e_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and perfil = 'ADMIN' and ativo = true
  );
$$;

revoke all on function public.usuario_e_admin() from public;
grant execute on function public.usuario_e_admin() to authenticated;

create or replace function public.admin_criar_setor(p_nome text)
returns public.setores
language plpgsql security definer set search_path = public
as $$
declare novo_setor public.setores;
begin
  if not public.usuario_e_admin() then
    raise exception 'Acesso permitido somente para administradores.';
  end if;
  if btrim(coalesce(p_nome, '')) = '' then
    raise exception 'Informe o nome do setor.';
  end if;
  insert into public.setores (nome)
  values (btrim(p_nome))
  returning * into novo_setor;
  return novo_setor;
exception when unique_violation then
  raise exception 'Ja existe um setor com esse nome.';
end;
$$;

revoke all on function public.admin_criar_setor(text) from public;
grant execute on function public.admin_criar_setor(text) to authenticated;

create or replace function public.admin_get_dashboard_v1()
returns json
language plpgsql security definer set search_path = public
as $$
declare resultado json;
begin
  if not public.usuario_e_admin() then
    raise exception 'Acesso permitido somente para administradores.';
  end if;

  select json_build_object(
    'setores', coalesce((select json_agg(x order by x.nome) from (
      select s.id, s.nome, s.ativo,
        (select count(*) from public.profiles p where p.setor_id = s.id) total_usuarios
      from public.setores s
    ) x), '[]'::json),
    'usuarios', coalesce((select json_agg(x order by x.nome) from (
      select p.id, p.nome, p.matricula, u.email,
        p.perfil, p.setor_id, s.nome setor_nome, p.ativo, p.criado_em
      from public.profiles p
      left join public.setores s on s.id = p.setor_id
      left join auth.users u on u.id = p.id
    ) x), '[]'::json)
  ) into resultado;

  return resultado;
end;
$$;

revoke all on function public.admin_get_dashboard_v1() from public;
grant execute on function public.admin_get_dashboard_v1() to authenticated;

create or replace function public.admin_get_presencas_dashboard_v1(
  p_data_inicio date,
  p_data_fim date,
  p_setor_id uuid default null
)
returns json
language plpgsql security definer set search_path = public
as $$
declare resultado json;
begin
  if not public.usuario_e_admin() then
    raise exception 'Acesso permitido somente para administradores.';
  end if;

  with hs as (
    select h.id, h.codigo, h.titulo, h.setor_id, s.nome setor_nome,
      h.data_local, h.status, h.responsavel_id, h.iniciado_em, h.encerrado_em,
      (select count(*) from public.profiles p where p.setor_id = h.setor_id and p.ativo) total_esperado,
      (select count(*) from public.presencas pr where pr.huddle_id = h.id and pr.confirmado_em is not null) total_confirmado,
      (select count(*) from public.presencas pr where pr.huddle_id = h.id and pr.status = 'PRESENTE') total_presentes,
      (select count(*) from public.presencas pr where pr.huddle_id = h.id and pr.status = 'ATRASADO') total_atrasados
    from public.huddles h
    join public.setores s on s.id = h.setor_id
    where h.data_local between p_data_inicio and p_data_fim
      and (p_setor_id is null or h.setor_id = p_setor_id)
  ), totals as (
    select count(*) total_huddles,
      count(*) filter (where status = 'AGENDADO') total_agendados,
      count(*) filter (where status = 'EM_ANDAMENTO') total_em_andamento,
      count(*) filter (where status = 'ENCERRADO') total_encerrados,
      count(*) filter (where status = 'CANCELADO') total_cancelados,
      coalesce(sum(total_esperado), 0) total_esperado,
      coalesce(sum(total_confirmado), 0) total_confirmado,
      coalesce(sum(total_presentes), 0) total_presentes,
      coalesce(sum(total_atrasados), 0) total_atrasados
    from hs
  )
  select json_build_object(
    'periodo', json_build_object('data_inicio', p_data_inicio, 'data_fim', p_data_fim, 'setor_id', p_setor_id),
    'kpis', (select json_build_object(
      'total_huddles', total_huddles, 'total_agendados', total_agendados,
      'total_em_andamento', total_em_andamento, 'total_encerrados', total_encerrados,
      'total_cancelados', total_cancelados, 'total_esperado', total_esperado,
      'total_confirmado', total_confirmado, 'total_presentes', total_presentes,
      'total_atrasados', total_atrasados, 'total_ausentes', greatest(total_esperado - total_confirmado, 0),
      'taxa_participacao', round((100.0 * total_confirmado / nullif(total_esperado, 0))::numeric, 1),
      'taxa_pontualidade', round((100.0 * total_presentes / nullif(total_confirmado, 0))::numeric, 1)
    ) from totals),
    'por_setor', coalesce((select json_agg(x) from (
      select setor_id, setor_nome, true ativo, count(*) total_huddles,
        sum(total_esperado) total_esperado, sum(total_confirmado) total_confirmado,
        sum(total_presentes) total_presentes, sum(total_atrasados) total_atrasados,
        greatest(sum(total_esperado) - sum(total_confirmado), 0) total_ausentes,
        round((100.0 * sum(total_confirmado) / nullif(sum(total_esperado), 0))::numeric, 1) taxa_participacao
      from hs group by setor_id, setor_nome order by setor_nome
    ) x), '[]'::json),
    'evolucao_diaria', coalesce((select json_agg(x order by data) from (
      select data_local data, count(*) total_huddles, sum(total_esperado) total_esperado,
        sum(total_confirmado) total_confirmado, sum(total_presentes) total_presentes,
        sum(total_atrasados) total_atrasados, greatest(sum(total_esperado) - sum(total_confirmado), 0) total_ausentes,
        round((100.0 * sum(total_confirmado) / nullif(sum(total_esperado), 0))::numeric, 1) taxa_participacao
      from hs group by data_local
    ) x), '[]'::json),
    'ultimos_huddles', coalesce((select json_agg(x) from (
      select id huddle_id, codigo, titulo, setor_id, setor_nome, data_local, status,
        (select nome from public.profiles where id = responsavel_id) responsavel_nome,
        iniciado_em, encerrado_em, total_esperado, total_confirmado, total_presentes,
        total_atrasados, greatest(total_esperado - total_confirmado, 0) total_ausentes,
        round((100.0 * total_confirmado / nullif(total_esperado, 0))::numeric, 1) taxa_participacao
      from hs order by data_local desc, iniciado_em desc nulls last limit 20
    ) x), '[]'::json),
    'ranking', '[]'::json
  ) into resultado;
  return resultado;
end;
$$;

revoke all on function public.admin_get_presencas_dashboard_v1(date, date, uuid) from public;
grant execute on function public.admin_get_presencas_dashboard_v1(date, date, uuid) to authenticated;
