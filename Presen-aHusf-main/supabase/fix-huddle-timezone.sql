-- Correcao do fuso horario usado na criacao dos Huddles.
-- Execute este arquivo no SQL Editor do Supabase para atualizar um banco existente.

create or replace function public.criar_huddle_lider(
  p_duracao_minutos integer default 30,
  p_atraso_apos_minutos integer default 10,
  p_hora_inicio time default null,
  p_hora_fim time default null
)
returns public.huddles
language plpgsql security definer set search_path = public
as $$
declare
  perfil_atual public.profiles;
  novo_huddle public.huddles;
  codigo_gerado text;
  data_huddle date;
  inicio_huddle timestamptz;
  fim_huddle timestamptz;
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

  data_huddle := (now() at time zone 'America/Sao_Paulo')::date;
  inicio_huddle := (
    data_huddle + coalesce(
      p_hora_inicio,
      (now() at time zone 'America/Sao_Paulo')::time
    )
  ) at time zone 'America/Sao_Paulo';
  fim_huddle := (
    data_huddle + coalesce(
      p_hora_fim,
      (now() at time zone 'America/Sao_Paulo')::time
        + make_interval(mins => greatest(p_duracao_minutos, 1))
    )
  ) at time zone 'America/Sao_Paulo';

  if fim_huddle <= inicio_huddle then
    fim_huddle := fim_huddle + interval '1 day';
  end if;

  codigo_gerado := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.huddles (
    codigo,
    titulo,
    setor_id,
    responsavel_id,
    status,
    data_local,
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
    (case
      when now() >= inicio_huddle then 'EM_ANDAMENTO'
      else 'AGENDADO'
    end)::public.status_huddle,
    data_huddle,
    inicio_huddle,
    fim_huddle,
    greatest(p_duracao_minutos, 1),
    greatest(p_atraso_apos_minutos, 0),
    'HUDDLE:' || gen_random_uuid()::text
  ) returning * into novo_huddle;

  return novo_huddle;
end;
$$;

grant execute on function public.criar_huddle_lider(integer, integer, time, time)
  to authenticated;
