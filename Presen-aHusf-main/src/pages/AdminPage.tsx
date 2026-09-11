import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'

import logoHorizontal from '../assets/logo-huddle-horizontal.png'
import logoVertical from '../assets/logo-huddle-vertical.png'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

import '../styles/admin-filters.css'
import '../styles/huddle-brand.css'
import '../styles/no-emoji.css'


type Perfil = 'COLABORADOR' | 'LIDER' | 'ADMIN'
type FiltroPerfil = 'TODOS' | Perfil
type FiltroStatus = 'TODOS' | 'ATIVO' | 'INATIVO'
type AbaAdmin = 'dashboard' | 'usuarios' | 'novo' | 'setores'

type StatusHuddle =
  | 'AGENDADO'
  | 'EM_ANDAMENTO'
  | 'ENCERRADO'
  | 'CANCELADO'

type StatusParticipante =
  | 'PRESENTE'
  | 'ATRASADO'
  | 'AUSENTE'

type FiltroParticipante =
  | 'TODOS'
  | StatusParticipante

type Setor = {
  id: string
  nome: string
  ativo: boolean
  total_usuarios: number
}

type Usuario = {
  id: string
  nome: string
  matricula: string
  email: string | null
  perfil: Perfil
  setor_id: string | null
  setor_nome: string | null
  ativo: boolean
  criado_em: string
}

type DashboardAdmin = {
  setores?: Setor[]
  usuarios?: Usuario[]
}

type DashboardPresencas = {
  periodo: {
    data_inicio: string
    data_fim: string
    setor_id: string | null
  }
  kpis: {
    total_huddles: number
    total_agendados: number
    total_em_andamento: number
    total_encerrados: number
    total_cancelados: number
    total_esperado: number
    total_confirmado: number
    total_presentes: number
    total_atrasados: number
    total_ausentes: number
    taxa_participacao: number
    taxa_pontualidade: number
  }
  por_setor: Array<{
    setor_id: string
    setor_nome: string
    ativo: boolean
    total_huddles: number
    total_esperado: number
    total_confirmado: number
    total_presentes: number
    total_atrasados: number
    total_ausentes: number
    taxa_participacao: number
  }>
  evolucao_diaria: Array<{
    data: string
    total_huddles: number
    total_esperado: number
    total_confirmado: number
    total_presentes: number
    total_atrasados: number
    total_ausentes: number
    taxa_participacao: number
  }>
  ultimos_huddles: Array<{
    huddle_id: string
    codigo: string
    titulo: string
    setor_id: string
    setor_nome: string
    data_local: string
    status: StatusHuddle
    responsavel_nome: string | null
    iniciado_em: string | null
    encerrado_em: string | null
    total_esperado: number
    total_confirmado: number
    total_presentes: number
    total_atrasados: number
    total_ausentes: number
    taxa_participacao: number
  }>
  ranking: Array<{
    posicao: number
    user_id: string
    nome: string
    matricula: string
    perfil: Perfil
    setor_id: string | null
    setor_nome: string | null
    total_esperado: number
    total_confirmado: number
    total_presentes: number
    total_atrasados: number
    total_ausentes: number
    taxa_participacao: number
  }>
}

type DetalhesHuddleResponse = {
  huddle: {
    huddle_id: string
    codigo: string
    titulo: string
    setor_id: string
    setor_nome: string
    data_local: string
    status: StatusHuddle
    criado_por: string
    responsavel_nome: string | null
    responsavel_matricula: string | null
    iniciado_em: string | null
    atraso_apos: string | null
    expira_em: string | null
    encerrado_em: string | null
    created_at: string
  }
  kpis: {
    total_esperado: number
    total_confirmado: number
    total_presentes: number
    total_atrasados: number
    total_ausentes: number
    taxa_participacao: number
    taxa_pontualidade: number
  }
  participantes: Array<{
    user_id: string
    nome: string
    matricula: string
    setor_nome: string
    perfil: Perfil | null
    status: StatusParticipante
    confirmado_em: string | null
    aceite: boolean
    aceite_em: string | null
    aceite_texto: string | null
    aceite_versao: string | null
    ip_address: string | null
    user_agent: string | null
    era_esperado: boolean
  }>
}

type AtualizarCredenciaisBody = {
  user_id: string
  email?: string
  password?: string
}

function converterPerfil(valor: string): Perfil {
  if (valor === 'LIDER' || valor === 'ADMIN') {
    return valor
  }

  return 'COLABORADOR'
}

function converterFiltroPerfil(valor: string): FiltroPerfil {
  if (
    valor === 'COLABORADOR'
    || valor === 'LIDER'
    || valor === 'ADMIN'
  ) {
    return valor
  }

  return 'TODOS'
}

function converterFiltroStatus(valor: string): FiltroStatus {
  if (valor === 'ATIVO' || valor === 'INATIVO') {
    return valor
  }

  return 'TODOS'
}

function converterFiltroParticipante(
  valor: string
): FiltroParticipante {
  if (
    valor === 'PRESENTE'
    || valor === 'ATRASADO'
    || valor === 'AUSENTE'
  ) {
    return valor
  }

  return 'TODOS'
}

function obterMensagemErro(
  error: unknown,
  mensagemPadrao: string
): string {
  if (error instanceof Error) {
    return error.message
  }

  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
  ) {
    return String(error.message)
  }

  return mensagemPadrao
}

function verificarErroResposta(data: unknown): void {
  if (
    typeof data === 'object'
    && data !== null
    && 'error' in data
    && data.error
  ) {
    throw new Error(String(data.error))
  }
}

function formatarDataInput(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

function dataInicialPadrao(): string {
  const data = new Date()
  data.setDate(data.getDate() - 29)

  return formatarDataInput(data)
}

function dataFinalPadrao(): string {
  return formatarDataInput(new Date())
}

function formatarDataBr(valor: string | null): string {
  if (!valor) {
    return '—'
  }

  const partes = valor.split('T')[0].split('-')

  if (partes.length !== 3) {
    return valor
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function formatarDataHora(valor: string | null): string {
  if (!valor) {
    return '—'
  }

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return '—'
  }

  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatarHora(valor: string | null): string {
  if (!valor) {
    return '—'
  }

  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return '—'
  }

  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatarPercentual(
  valor: number | null | undefined
): string {
  return Number(valor ?? 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

function formatarStatusHuddle(status: StatusHuddle): string {
  if (status === 'EM_ANDAMENTO') {
    return 'Em andamento'
  }

  if (status === 'ENCERRADO') {
    return 'Encerrado'
  }

  if (status === 'CANCELADO') {
    return 'Cancelado'
  }

  return 'Agendado'
}

function classeStatusHuddle(status: StatusHuddle): string {
  if (status === 'EM_ANDAMENTO') {
    return 'dashboard-status dashboard-status-live'
  }

  if (status === 'ENCERRADO') {
    return 'dashboard-status dashboard-status-closed'
  }

  if (status === 'CANCELADO') {
    return 'dashboard-status dashboard-status-cancelled'
  }

  return 'dashboard-status dashboard-status-scheduled'
}

function formatarStatusParticipante(
  status: StatusParticipante
): string {
  if (status === 'PRESENTE') {
    return 'Presente'
  }

  if (status === 'ATRASADO') {
    return 'Atrasado'
  }

  return 'Ausente'
}

function classeStatusParticipante(
  status: StatusParticipante
): string {
  if (status === 'PRESENTE') {
    return [
      'huddle-detail-participant-status',
      'huddle-detail-participant-present',
    ].join(' ')
  }

  if (status === 'ATRASADO') {
    return [
      'huddle-detail-participant-status',
      'huddle-detail-participant-late',
    ].join(' ')
  }

  return [
    'huddle-detail-participant-status',
    'huddle-detail-participant-absent',
  ].join(' ')
}

function iniciaisNome(nome: string): string {
  const partes = nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (partes.length === 0) {
    return '?'
  }

  if (partes.length === 1) {
    return partes[0].charAt(0).toUpperCase()
  }

  return (
    partes[0].charAt(0)
    + partes[partes.length - 1].charAt(0)
  ).toUpperCase()
}

export function AdminPage() {
  const { logout } = useAuth()

  const [setores, setSetores] = useState<Setor[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [
    atualizandoCredenciais,
    setAtualizandoCredenciais,
  ] = useState(false)

  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [aba, setAba] = useState<AbaAdmin>('dashboard')

  const [
    dashboard,
    setDashboard,
  ] = useState<DashboardPresencas | null>(null)

  const [
    dashboardLoading,
    setDashboardLoading,
  ] = useState(true)

  const [dashboardErro, setDashboardErro] = useState('')
  const [dataInicio, setDataInicio] = useState(dataInicialPadrao)
  const [dataFim, setDataFim] = useState(dataFinalPadrao)
  const [dashboardSetorId, setDashboardSetorId] =
    useState('TODOS')

  const [
    detalhesHuddle,
    setDetalhesHuddle,
  ] = useState<DetalhesHuddleResponse | null>(null)

  const [
    detalhesHuddleAberto,
    setDetalhesHuddleAberto,
  ] = useState(false)

  const [
    detalhesHuddleLoading,
    setDetalhesHuddleLoading,
  ] = useState(false)

  const [
    detalhesHuddleErro,
    setDetalhesHuddleErro,
  ] = useState('')

  const [
    filtroParticipante,
    setFiltroParticipante,
  ] = useState<FiltroParticipante>('TODOS')

  const [buscaUsuario, setBuscaUsuario] = useState('')
  const [
    filtroPerfil,
    setFiltroPerfil,
  ] = useState<FiltroPerfil>('TODOS')

  const [filtroSetor, setFiltroSetor] = useState('TODOS')
  const [
    filtroStatus,
    setFiltroStatus,
  ] = useState<FiltroStatus>('TODOS')

  const [nome, setNome] = useState('')
  const [matricula, setMatricula] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [perfil, setPerfil] =
    useState<Perfil>('COLABORADOR')

  const [setorId, setSetorId] = useState('')
  const [novoSetor, setNovoSetor] = useState('')

  const [
    usuarioEditando,
    setUsuarioEditando,
  ] = useState<Usuario | null>(null)

  const [editNome, setEditNome] = useState('')
  const [editMatricula, setEditMatricula] = useState('')
  const [
    editPerfil,
    setEditPerfil,
  ] = useState<Perfil>('COLABORADOR')

  const [editSetorId, setEditSetorId] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editNovaSenha, setEditNovaSenha] = useState('')

  useEffect(() => {
    void carregarDados()
    void carregarDashboard()
  }, [])

  const usuariosFiltrados = useMemo(() => {
    const termo = buscaUsuario.trim().toLowerCase()

    return usuarios.filter(usuario => {
      const correspondeBusca =
        termo === ''
        || usuario.nome.toLowerCase().includes(termo)
        || usuario.matricula.toLowerCase().includes(termo)
        || (usuario.email ?? '').toLowerCase().includes(termo)
        || (usuario.setor_nome ?? '')
          .toLowerCase()
          .includes(termo)

      const correspondePerfil =
        filtroPerfil === 'TODOS'
        || usuario.perfil === filtroPerfil

      const correspondeSetor =
        filtroSetor === 'TODOS'
        || usuario.setor_id === filtroSetor

      const correspondeStatus =
        filtroStatus === 'TODOS'
        || (
          filtroStatus === 'ATIVO'
          && usuario.ativo
        )
        || (
          filtroStatus === 'INATIVO'
          && !usuario.ativo
        )

      return (
        correspondeBusca
        && correspondePerfil
        && correspondeSetor
        && correspondeStatus
      )
    })
  }, [
    usuarios,
    buscaUsuario,
    filtroPerfil,
    filtroSetor,
    filtroStatus,
  ])

  const participantesDetalhesFiltrados = useMemo(() => {
    const participantes = detalhesHuddle?.participantes ?? []

    if (filtroParticipante === 'TODOS') {
      return participantes
    }

    return participantes.filter(
      participante =>
        participante.status === filtroParticipante
    )
  }, [
    detalhesHuddle,
    filtroParticipante,
  ])

  function limparFiltros() {
    setBuscaUsuario('')
    setFiltroPerfil('TODOS')
    setFiltroSetor('TODOS')
    setFiltroStatus('TODOS')
  }

  async function carregarDados(exibirLoading = true) {
    try {
      if (exibirLoading) {
        setLoading(true)
      }

      setErro('')

      const { data, error } = await supabase.rpc(
        'admin_get_dashboard_v1'
      )

      if (error) {
        throw new Error(
          [
            error.message,
            error.details,
            error.hint,
            error.code,
          ]
            .filter(Boolean)
            .join(' | ')
        )
      }

      const painel = (data ?? {}) as DashboardAdmin

      const listaSetores = Array.isArray(painel.setores)
        ? painel.setores
        : []

      const listaUsuarios = Array.isArray(painel.usuarios)
        ? painel.usuarios
        : []

      setSetores(listaSetores)
      setUsuarios(listaUsuarios)

      setSetorId(setorAtual => {
        const setorAtualExiste = listaSetores.some(
          setor =>
            setor.id === setorAtual
            && setor.ativo
        )

        if (setorAtualExiste) {
          return setorAtual
        }

        return (
          listaSetores.find(setor => setor.ativo)?.id
          ?? ''
        )
      })
    } catch (error) {
      console.error('Falha no Admin:', error)

      setErro(
        obterMensagemErro(
          error,
          'Não foi possível carregar a administração.'
        )
      )
    } finally {
      if (exibirLoading) {
        setLoading(false)
      }
    }
  }

  async function carregarDashboard(
    exibirLoading = true
  ) {
    try {
      if (exibirLoading) {
        setDashboardLoading(true)
      }

      setDashboardErro('')

      if (!dataInicio || !dataFim) {
        throw new Error(
          'Informe a data inicial e a data final.'
        )
      }

      if (dataInicio > dataFim) {
        throw new Error(
          'A data inicial não pode ser maior que a data final.'
        )
      }

      const { data, error } = await supabase.rpc(
        'admin_get_presencas_dashboard_v1',
        {
          p_data_inicio: dataInicio,
          p_data_fim: dataFim,
          p_setor_id:
            dashboardSetorId === 'TODOS'
              ? null
              : dashboardSetorId,
        }
      )

      if (error) {
        throw new Error(
          [
            error.message,
            error.details,
            error.hint,
            error.code,
          ]
            .filter(Boolean)
            .join(' | ')
        )
      }

      setDashboard(
        (data ?? null) as DashboardPresencas | null
      )
    } catch (error) {
      console.error('Erro no dashboard:', error)

      setDashboardErro(
        obterMensagemErro(
          error,
          'Não foi possível carregar os indicadores.'
        )
      )
    } finally {
      if (exibirLoading) {
        setDashboardLoading(false)
      }
    }
  }

  async function filtrarDashboard(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()
    await carregarDashboard()
  }

  async function abrirDetalhesHuddle(
    huddleId: string
  ) {
    try {
      setDetalhesHuddleAberto(true)
      setDetalhesHuddleLoading(true)
      setDetalhesHuddleErro('')
      setDetalhesHuddle(null)
      setFiltroParticipante('TODOS')

      const { data, error } = await supabase.rpc(
        'admin_get_detalhes_huddle_v1',
        {
          p_huddle_id: huddleId,
        }
      )

      if (error) {
        throw new Error(
          [
            error.message,
            error.details,
            error.hint,
            error.code,
          ]
            .filter(Boolean)
            .join(' | ')
        )
      }

      setDetalhesHuddle(
        (data ?? null) as DetalhesHuddleResponse | null
      )
    } catch (error) {
      console.error(
        'Erro nos detalhes do Huddle:',
        error
      )

      setDetalhesHuddleErro(
        obterMensagemErro(
          error,
          'Não foi possível carregar os participantes.'
        )
      )
    } finally {
      setDetalhesHuddleLoading(false)
    }
  }

  function fecharDetalhesHuddle() {
    setDetalhesHuddleAberto(false)
    setDetalhesHuddle(null)
    setDetalhesHuddleErro('')
    setFiltroParticipante('TODOS')
  }

  async function criarUsuario(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    try {
      setSalvando(true)
      setErro('')
      setSucesso('')

      if (
        !nome.trim()
        || !matricula.trim()
        || !email.trim()
        || !senha
        || !setorId
      ) {
        throw new Error(
          'Preencha todos os campos obrigatórios.'
        )
      }

      if (senha.length < 8) {
        throw new Error(
          'A senha deve possuir pelo menos 8 caracteres.'
        )
      }

      const { data, error } = await supabase
        .functions
        .invoke(
          'admin-create-user',
          {
            body: {
              nome: nome.trim(),
              matricula: matricula.trim(),
              email: email.trim().toLowerCase(),
              password: senha,
              perfil,
              setor_id: setorId,
            },
          }
        )

      if (error) {
        throw error
      }

      verificarErroResposta(data)

      setNome('')
      setMatricula('')
      setEmail('')
      setSenha('')
      setPerfil('COLABORADOR')
      setSucesso('Usuário criado com sucesso.')

      await Promise.all([
        carregarDados(false),
        carregarDashboard(false),
      ])

      setAba('usuarios')
    } catch (error) {
      console.error('Erro ao criar usuário:', error)

      setErro(
        obterMensagemErro(
          error,
          'Não foi possível criar o usuário.'
        )
      )
    } finally {
      setSalvando(false)
    }
  }

  function abrirEdicao(usuario: Usuario) {
    setUsuarioEditando(usuario)
    setEditNome(usuario.nome)
    setEditMatricula(usuario.matricula)
    setEditPerfil(usuario.perfil)
    setEditSetorId(usuario.setor_id ?? '')
    setEditEmail(usuario.email ?? '')
    setEditNovaSenha('')
    setErro('')
    setSucesso('')
  }

  function fecharEdicao() {
    setUsuarioEditando(null)
    setEditNovaSenha('')
  }

  async function salvarEdicao(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!usuarioEditando) {
      return
    }

    try {
      setSalvando(true)
      setErro('')
      setSucesso('')

      if (
        !editNome.trim()
        || !editMatricula.trim()
        || !editSetorId
      ) {
        throw new Error(
          'Preencha todos os campos obrigatórios.'
        )
      }

      const { error } = await supabase.rpc(
        'admin_editar_usuario',
        {
          p_user_id: usuarioEditando.id,
          p_nome: editNome.trim(),
          p_matricula: editMatricula.trim(),
          p_perfil: editPerfil,
          p_setor_id: editSetorId,
        }
      )

      if (error) {
        throw error
      }

      setSucesso(
        'Dados do perfil atualizados com sucesso.'
      )

      setUsuarioEditando(usuarioAtual => {
        if (!usuarioAtual) {
          return null
        }

        const setorSelecionado = setores.find(
          setor => setor.id === editSetorId
        )

        return {
          ...usuarioAtual,
          nome: editNome.trim(),
          matricula: editMatricula.trim(),
          perfil: editPerfil,
          setor_id: editSetorId,
          setor_nome: setorSelecionado?.nome ?? null,
        }
      })

      await Promise.all([
        carregarDados(false),
        carregarDashboard(false),
      ])
    } catch (error) {
      console.error('Erro ao editar usuário:', error)

      setErro(
        obterMensagemErro(
          error,
          'Não foi possível editar o usuário.'
        )
      )
    } finally {
      setSalvando(false)
    }
  }

  async function atualizarCredenciais(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (!usuarioEditando) {
      return
    }

    try {
      setAtualizandoCredenciais(true)
      setErro('')
      setSucesso('')

      const emailNormalizado =
        editEmail.trim().toLowerCase()

      const emailAtual =
        (usuarioEditando.email ?? '')
          .trim()
          .toLowerCase()

      const alterouEmail =
        emailNormalizado !== emailAtual

      const informouSenha =
        editNovaSenha.length > 0

      if (!alterouEmail && !informouSenha) {
        throw new Error(
          'Altere o e-mail ou informe uma nova senha.'
        )
      }

      if (
        alterouEmail
        && (
          !emailNormalizado
          || !emailNormalizado.includes('@')
        )
      ) {
        throw new Error(
          'Informe um e-mail válido.'
        )
      }

      if (
        informouSenha
        && editNovaSenha.length < 8
      ) {
        throw new Error(
          'A nova senha deve possuir pelo menos 8 caracteres.'
        )
      }

      const body: AtualizarCredenciaisBody = {
        user_id: usuarioEditando.id,
      }

      if (alterouEmail) {
        body.email = emailNormalizado
      }

      if (informouSenha) {
        body.password = editNovaSenha
      }

      const { data, error } = await supabase
        .functions
        .invoke(
          'admin-update-auth',
          { body }
        )

      if (error) {
        throw error
      }

      verificarErroResposta(data)

      setEditNovaSenha('')

      setUsuarioEditando(usuarioAtual => {
        if (!usuarioAtual) {
          return null
        }

        return {
          ...usuarioAtual,
          email:
            alterouEmail
              ? emailNormalizado
              : usuarioAtual.email,
        }
      })

      setSucesso(
        informouSenha && alterouEmail
          ? 'E-mail e senha atualizados com sucesso.'
          : alterouEmail
            ? 'E-mail atualizado com sucesso.'
            : 'Senha atualizada com sucesso.'
      )

      await carregarDados(false)
    } catch (error) {
      console.error(
        'Erro ao atualizar credenciais:',
        error
      )

      setErro(
        obterMensagemErro(
          error,
          'Não foi possível atualizar as credenciais.'
        )
      )
    } finally {
      setAtualizandoCredenciais(false)
    }
  }

  async function alterarStatus(usuario: Usuario) {
    try {
      setErro('')
      setSucesso('')

      const { error } = await supabase.rpc(
        'admin_alterar_usuario',
        {
          p_user_id: usuario.id,
          p_perfil: usuario.perfil,
          p_setor_id: usuario.setor_id,
          p_ativo: !usuario.ativo,
        }
      )

      if (error) {
        throw error
      }

      setSucesso(
        usuario.ativo
          ? 'Usuário desativado.'
          : 'Usuário ativado.'
      )

      await Promise.all([
        carregarDados(false),
        carregarDashboard(false),
      ])
    } catch (error) {
      console.error(
        'Erro ao alterar status:',
        error
      )

      setErro(
        obterMensagemErro(
          error,
          'Não foi possível alterar o usuário.'
        )
      )
    }
  }

  async function criarSetor(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    try {
      setSalvando(true)
      setErro('')
      setSucesso('')

      if (!novoSetor.trim()) {
        throw new Error(
          'Informe o nome do setor.'
        )
      }

      const { error } = await supabase.rpc(
        'admin_criar_setor',
        {
          p_nome: novoSetor.trim(),
        }
      )

      if (error) {
        throw error
      }

      setNovoSetor('')
      setSucesso('Setor criado com sucesso.')

      await Promise.all([
        carregarDados(false),
        carregarDashboard(false),
      ])
    } catch (error) {
      console.error('Erro ao criar setor:', error)

      setErro(
        obterMensagemErro(
          error,
          'Não foi possível criar o setor.'
        )
      )
    } finally {
      setSalvando(false)
    }
  }

  async function excluirSetor(setor: Setor) {
    const confirmar = window.confirm(
      `Excluir o setor "${setor.nome}"? Essa ação não pode ser desfeita.`
    )

    if (!confirmar) {
      return
    }

    try {
      setSalvando(true)
      setErro('')
      setSucesso('')

      const { error } = await supabase.rpc(
        'admin_excluir_setor',
        {
          p_setor_id: setor.id,
        }
      )

      if (error) {
        throw error
      }

      setSucesso('Setor excluído com sucesso.')

      await Promise.all([
        carregarDados(false),
        carregarDashboard(false),
      ])
    } catch (error) {
      console.error('Erro ao excluir setor:', error)

      setErro(
        obterMensagemErro(
          error,
          'Não foi possível excluir o setor.'
        )
      )
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />

        <p>
          Carregando administração...
        </p>
      </div>
    )
  }

  const kpis = dashboard?.kpis
  const porSetor = dashboard?.por_setor ?? []
  const evolucao = dashboard?.evolucao_diaria ?? []
  const ultimosHuddles = dashboard?.ultimos_huddles ?? []
  const ranking = dashboard?.ranking ?? []

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <span>
            ADMINISTRAÇÃO
          </span>

          <h1>
            Gestão do Huddle
          </h1>

          <p>
            Presenças, usuários e setores
          </p>
        </div>

        <button
          type="button"
          className="avatar"
          onClick={logout}
          title="Sair do sistema"
        >
          A
        </button>
      </header>

      <section className="admin-kpis">
        <div>
          <span>
            Usuários
          </span>

          <strong>
            {usuarios.length}
          </strong>
        </div>

        <div>
          <span>
            Ativos
          </span>

          <strong>
            {
              usuarios.filter(
                usuario => usuario.ativo
              ).length
            }
          </strong>
        </div>

        <div>
          <span>
            Setores
          </span>

          <strong>
            {setores.length}
          </strong>
        </div>
      </section>

      <nav className="admin-tabs admin-tabs-four">
        <div className="admin-brand">
          <img
            src={logoHorizontal}
            alt="Huddle - Hospital Universitário Sagrada Família"
            className="admin-brand-horizontal"
          />
        </div>
        <button
          type="button"
          className={
            aba === 'dashboard'
              ? 'admin-tab-active'
              : ''
          }
          onClick={() => {
            setAba('dashboard')
            setErro('')
            setSucesso('')
          }}
        >
          Dashboard
        </button>

        <button
          type="button"
          className={
            aba === 'usuarios'
              ? 'admin-tab-active'
              : ''
          }
          onClick={() => {
            setAba('usuarios')
            setErro('')
            setSucesso('')
          }}
        >
          Usuários
        </button>

        <button
          type="button"
          className={
            aba === 'novo'
              ? 'admin-tab-active'
              : ''
          }
          onClick={() => {
            setAba('novo')
            setErro('')
            setSucesso('')
          }}
        >
          Novo usuário
        </button>

        <button
          type="button"
          className={
            aba === 'setores'
              ? 'admin-tab-active'
              : ''
          }
          onClick={() => {
            setAba('setores')
            setErro('')
            setSucesso('')
          }}
        >
          Setores
        </button>

        <div className="admin-brand-footer">
          <img
            src={logoVertical}
            alt="Huddle - Hospital Universitário Sagrada Família"
            className="admin-brand-vertical"
          />
        </div>
      </nav>

      {
        erro
        && (
          <div className="scanner-error">
            {erro}
          </div>
        )
      }

      {
        sucesso
        && (
          <div className="admin-success">
            {sucesso}
          </div>
        )
      }

      {
        aba === 'dashboard'
        && (
          <section className="dashboard-admin">
            <form
              className="dashboard-filters"
              onSubmit={filtrarDashboard}
            >
              <div className="dashboard-filter-heading">
                <div>
                  <span>
                    PERÍODO DE ANÁLISE
                  </span>

                  <strong>
                    Filtros do dashboard
                  </strong>
                </div>

                <button
                  type="submit"
                  disabled={dashboardLoading}
                >
                  {
                    dashboardLoading
                      ? 'Atualizando...'
                      : 'Aplicar filtros'
                  }
                </button>
              </div>

              <div className="dashboard-filter-grid">
                <label>
                  Data inicial

                  <input
                    type="date"
                    value={dataInicio}
                    onChange={
                      event =>
                        setDataInicio(
                          event.target.value
                        )
                    }
                    required
                  />
                </label>

                <label>
                  Data final

                  <input
                    type="date"
                    value={dataFim}
                    onChange={
                      event =>
                        setDataFim(
                          event.target.value
                        )
                    }
                    required
                  />
                </label>

                <label>
                  Setor

                  <select
                    value={dashboardSetorId}
                    onChange={
                      event =>
                        setDashboardSetorId(
                          event.target.value
                        )
                    }
                  >
                    <option value="TODOS">
                      Todos os setores
                    </option>

                    {
                      setores.map(
                        setor => (
                          <option
                            key={setor.id}
                            value={setor.id}
                          >
                            {setor.nome}
                          </option>
                        )
                      )
                    }
                  </select>
                </label>
              </div>
            </form>

            {
              dashboardErro
              && (
                <div className="scanner-error">
                  ⚠️ {dashboardErro}
                </div>
              )
            }

            {
              dashboardLoading
                ? (
                  <div className="dashboard-loading">
                    <div className="spinner" />

                    <p>
                      Carregando indicadores...
                    </p>
                  </div>
                )
                : (
                  <>
                    <div className="dashboard-period">
                      <span>
                        Período analisado
                      </span>

                      <strong>
                        {
                          formatarDataBr(
                            dashboard?.periodo.data_inicio
                            ?? dataInicio
                          )
                        }

                        {' até '}

                        {
                          formatarDataBr(
                            dashboard?.periodo.data_fim
                            ?? dataFim
                          )
                        }
                      </strong>
                    </div>

                    <section className="dashboard-main-kpis">
                      <article className="dashboard-main-kpi dashboard-main-kpi-primary">
                        <span>
                          Taxa de participação
                        </span>

                        <strong>
                          {
                            formatarPercentual(
                              kpis?.taxa_participacao
                            )
                          }%
                        </strong>

                        <small>
                          {kpis?.total_confirmado ?? 0}
                          {' de '}
                          {kpis?.total_esperado ?? 0}
                          {' confirmações'}
                        </small>
                      </article>

                      <article className="dashboard-main-kpi">
                        <span>
                          Huddles realizados
                        </span>

                        <strong>
                          {kpis?.total_huddles ?? 0}
                        </strong>

                        <small>
                          {kpis?.total_encerrados ?? 0}
                          {' encerrados'}
                        </small>
                      </article>

                      <article className="dashboard-main-kpi">
                        <span>
                          Confirmados
                        </span>

                        <strong>
                          {kpis?.total_confirmado ?? 0}
                        </strong>

                        <small>
                          Presentes e atrasados
                        </small>
                      </article>

                      <article className="dashboard-main-kpi dashboard-main-kpi-danger">
                        <span>
                          Ausências
                        </span>

                        <strong>
                          {kpis?.total_ausentes ?? 0}
                        </strong>

                        <small>
                          Sem confirmação
                        </small>
                      </article>
                    </section>

                    <section className="dashboard-secondary-kpis">
                      <article>
                        <div className="dashboard-kpi-icon"></div>

                        <div>
                          <span>
                            Presentes no horário
                          </span>

                          <strong>
                            {kpis?.total_presentes ?? 0}
                          </strong>
                        </div>
                      </article>

                      <article>
                        <div className="dashboard-kpi-icon dashboard-kpi-icon-warning"></div>

                        <div>
                          <span>
                            Atrasados
                          </span>

                          <strong>
                            {kpis?.total_atrasados ?? 0}
                          </strong>
                        </div>
                      </article>

                      <article>
                        <div className="dashboard-kpi-icon dashboard-kpi-icon-purple">
                          %
                        </div>

                        <div>
                          <span>
                            Pontualidade
                          </span>

                          <strong>
                            {
                              formatarPercentual(
                                kpis?.taxa_pontualidade
                              )
                            }%
                          </strong>
                        </div>
                      </article>

                      <article>
                        <div className="dashboard-kpi-icon dashboard-kpi-icon-red">
                          ×
                        </div>

                        <div>
                          <span>
                            Cancelados
                          </span>

                          <strong>
                            {kpis?.total_cancelados ?? 0}
                          </strong>
                        </div>
                      </article>
                    </section>

                    <section className="dashboard-status-summary">
                      <div>
                        <span>
                          Agendados
                        </span>

                        <strong>
                          {kpis?.total_agendados ?? 0}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Em andamento
                        </span>

                        <strong>
                          {kpis?.total_em_andamento ?? 0}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Encerrados
                        </span>

                        <strong>
                          {kpis?.total_encerrados ?? 0}
                        </strong>
                      </div>
                    </section>

                    <section className="dashboard-section">
                      <div className="dashboard-section-header">
                        <div>
                          <span>
                            COMPARATIVO
                          </span>

                          <h2>
                            Participação por setor
                          </h2>
                        </div>
                      </div>

                      {
                        porSetor.length === 0
                          ? (
                            <div className="dashboard-empty">
                              Nenhum setor encontrado no período.
                            </div>
                          )
                          : (
                            <div className="dashboard-sector-list">
                              {
                                porSetor.map(
                                  setor => (
                                    <article
                                      key={setor.setor_id}
                                      className="dashboard-sector-card"
                                    >
                                      <div className="dashboard-sector-top">
                                        <div>
                                          <strong>
                                            {setor.setor_nome}
                                          </strong>

                                          <span>
                                            {setor.total_huddles}
                                            {' Huddle(s)'}
                                          </span>
                                        </div>

                                        <b>
                                          {
                                            formatarPercentual(
                                              setor.taxa_participacao
                                            )
                                          }%
                                        </b>
                                      </div>

                                      <div className="dashboard-progress">
                                        <div
                                          style={{
                                            width:
                                              `${Math.min(
                                                Number(
                                                  setor.taxa_participacao
                                                ),
                                                100
                                              )}%`,
                                          }}
                                        />
                                      </div>

                                      <div className="dashboard-sector-numbers">
                                        <span>
                                          <strong>
                                            {setor.total_confirmado}
                                          </strong>

                                          confirmados
                                        </span>

                                        <span>
                                          <strong>
                                            {setor.total_presentes}
                                          </strong>

                                          no horário
                                        </span>

                                        <span>
                                          <strong>
                                            {setor.total_atrasados}
                                          </strong>

                                          atrasados
                                        </span>

                                        <span>
                                          <strong>
                                            {setor.total_ausentes}
                                          </strong>

                                          ausentes
                                        </span>
                                      </div>
                                    </article>
                                  )
                                )
                              }
                            </div>
                          )
                      }
                    </section>

                    <section className="dashboard-section">
                      <div className="dashboard-section-header">
                        <div>
                          <span>
                            EVOLUÇÃO
                          </span>

                          <h2>
                            Participação diária
                          </h2>
                        </div>
                      </div>

                      {
                        evolucao.length === 0
                          ? (
                            <div className="dashboard-empty">
                              Nenhum Huddle encontrado no período.
                            </div>
                          )
                          : (
                            <div className="dashboard-evolution-list">
                              {
                                evolucao.map(
                                  dia => (
                                    <article
                                      key={dia.data}
                                      className="dashboard-evolution-row"
                                    >
                                      <div className="dashboard-evolution-date">
                                        <strong>
                                          {formatarDataBr(dia.data)}
                                        </strong>

                                        <span>
                                          {dia.total_huddles}
                                          {' Huddle(s)'}
                                        </span>
                                      </div>

                                      <div className="dashboard-evolution-bar">
                                        <div
                                          style={{
                                            width:
                                              `${Math.min(
                                                Number(
                                                  dia.taxa_participacao
                                                ),
                                                100
                                              )}%`,
                                          }}
                                        />
                                      </div>

                                      <div className="dashboard-evolution-value">
                                        <strong>
                                          {
                                            formatarPercentual(
                                              dia.taxa_participacao
                                            )
                                          }%
                                        </strong>

                                        <span>
                                          {dia.total_confirmado}
                                          {'/'}
                                          {dia.total_esperado}
                                        </span>
                                      </div>
                                    </article>
                                  )
                                )
                              }
                            </div>
                          )
                      }
                    </section>

                    <section className="dashboard-section">
                      <div className="dashboard-section-header dashboard-section-header-action">
                        <div>
                          <span>
                            HISTÓRICO RECENTE
                          </span>

                          <h2>
                            Últimos Huddles
                          </h2>
                        </div>

                        <small>
                          Clique em “Ver participantes”
                        </small>
                      </div>

                      {
                        ultimosHuddles.length === 0
                          ? (
                            <div className="dashboard-empty">
                              Nenhum Huddle encontrado.
                            </div>
                          )
                          : (
                            <div className="dashboard-huddle-list">
                              {
                                ultimosHuddles.map(
                                  huddle => (
                                    <article
                                      key={huddle.huddle_id}
                                      className="dashboard-huddle-card"
                                    >
                                      <div className="dashboard-huddle-top">
                                        <div>
                                          <span className="dashboard-huddle-code">
                                            {huddle.codigo}
                                          </span>

                                          <h3>
                                            {huddle.titulo}
                                          </h3>

                                          <p>
                                            {huddle.setor_nome}
                                            {' • '}
                                            {
                                              formatarDataBr(
                                                huddle.data_local
                                              )
                                            }
                                          </p>
                                        </div>

                                        <span
                                          className={
                                            classeStatusHuddle(
                                              huddle.status
                                            )
                                          }
                                        >
                                          {
                                            formatarStatusHuddle(
                                              huddle.status
                                            )
                                          }
                                        </span>
                                      </div>

                                      <div className="dashboard-huddle-details">
                                        <div>
                                          <span>
                                            Responsável
                                          </span>

                                          <strong>
                                            {
                                              huddle.responsavel_nome
                                              ?? 'Não informado'
                                            }
                                          </strong>
                                        </div>

                                        <div>
                                          <span>
                                            Início
                                          </span>

                                          <strong>
                                            {
                                              formatarDataHora(
                                                huddle.iniciado_em
                                              )
                                            }
                                          </strong>
                                        </div>
                                      </div>

                                      <div className="dashboard-huddle-numbers">
                                        <span>
                                          <strong>
                                            {huddle.total_esperado}
                                          </strong>

                                          esperados
                                        </span>

                                        <span>
                                          <strong>
                                            {huddle.total_confirmado}
                                          </strong>

                                          confirmados
                                        </span>

                                        <span>
                                          <strong>
                                            {huddle.total_ausentes}
                                          </strong>

                                          ausentes
                                        </span>

                                        <span>
                                          <strong>
                                            {
                                              formatarPercentual(
                                                huddle.taxa_participacao
                                              )
                                            }%
                                          </strong>

                                          participação
                                        </span>
                                      </div>

                                      <button
                                        type="button"
                                        className="dashboard-huddle-open-button"
                                        onClick={() =>
                                          void abrirDetalhesHuddle(
                                            huddle.huddle_id
                                          )
                                        }
                                      >
                                        Ver participantes
                                      </button>
                                    </article>
                                  )
                                )
                              }
                            </div>
                          )
                      }
                    </section>

                    <section className="dashboard-section">
                      <div className="dashboard-section-header">
                        <div>
                          <span>
                            DESEMPENHO
                          </span>

                          <h2>
                            Ranking de participação
                          </h2>
                        </div>
                      </div>

                      {
                        ranking.length === 0
                          ? (
                            <div className="dashboard-empty">
                              Ainda não existem dados suficientes para o ranking.
                            </div>
                          )
                          : (
                            <div className="dashboard-ranking-list">
                              {
                                ranking.map(
                                  participante => (
                                    <article
                                      key={participante.user_id}
                                      className="dashboard-ranking-row"
                                    >
                                      <div className="dashboard-ranking-position">
                                        {participante.posicao}º
                                      </div>

                                      <div className="dashboard-ranking-avatar">
                                        {
                                          iniciaisNome(
                                            participante.nome
                                          )
                                        }
                                      </div>

                                      <div className="dashboard-ranking-info">
                                        <strong>
                                          {participante.nome}
                                        </strong>

                                        <span>
                                          {
                                            participante.setor_nome
                                            ?? 'Sem setor'
                                          }
                                          {' • Matrícula '}
                                          {participante.matricula}
                                        </span>
                                      </div>

                                      <div className="dashboard-ranking-numbers">
                                        <strong>
                                          {
                                            formatarPercentual(
                                              participante.taxa_participacao
                                            )
                                          }%
                                        </strong>

                                        <span>
                                          {participante.total_confirmado}
                                          {'/'}
                                          {participante.total_esperado}
                                        </span>
                                      </div>
                                    </article>
                                  )
                                )
                              }
                            </div>
                          )
                      }
                    </section>
                  </>
                )
            }
          </section>
        )
      }

      {
        aba === 'usuarios'
        && (
          <section className="admin-user-list">
            <div className="admin-filters">
              <div className="admin-search-box">
                <span></span>

                <input
                  type="search"
                  placeholder="Buscar por nome, matrícula, e-mail ou setor"
                  value={buscaUsuario}
                  onChange={
                    event =>
                      setBuscaUsuario(
                        event.target.value
                      )
                  }
                />
              </div>

              <div className="admin-filter-grid">
                <select
                  value={filtroPerfil}
                  onChange={
                    event =>
                      setFiltroPerfil(
                        converterFiltroPerfil(
                          event.target.value
                        )
                      )
                  }
                >
                  <option value="TODOS">
                    Todos os perfis
                  </option>

                  <option value="COLABORADOR">
                    Colaboradores
                  </option>

                  <option value="LIDER">
                    Líderes
                  </option>

                  <option value="ADMIN">
                    Administradores
                  </option>
                </select>

                <select
                  value={filtroSetor}
                  onChange={
                    event =>
                      setFiltroSetor(
                        event.target.value
                      )
                  }
                >
                  <option value="TODOS">
                    Todos os setores
                  </option>

                  {
                    setores.map(
                      setor => (
                        <option
                          key={setor.id}
                          value={setor.id}
                        >
                          {setor.nome}
                        </option>
                      )
                    )
                  }
                </select>

                <select
                  value={filtroStatus}
                  onChange={
                    event =>
                      setFiltroStatus(
                        converterFiltroStatus(
                          event.target.value
                        )
                      )
                  }
                >
                  <option value="TODOS">
                    Todos os status
                  </option>

                  <option value="ATIVO">
                    Ativos
                  </option>

                  <option value="INATIVO">
                    Inativos
                  </option>
                </select>
              </div>

              <div className="admin-filter-result">
                <span>
                  {usuariosFiltrados.length}
                  {' de '}
                  {usuarios.length}
                  {' usuário(s)'}
                </span>

                <button
                  type="button"
                  onClick={limparFiltros}
                >
                  Limpar filtros
                </button>
              </div>
            </div>

            {
              usuarios.length === 0
                ? (
                  <div className="history-empty">
                    <h2>
                      Nenhum usuário
                    </h2>

                    <p>
                      Cadastre o primeiro usuário.
                    </p>
                  </div>
                )
                : usuariosFiltrados.length === 0
                  ? (
                    <div className="history-empty">
                      <h2>
                        Nenhum usuário encontrado
                      </h2>

                      <p>
                        Altere os filtros ou faça uma nova busca.
                      </p>

                      <button
                        type="button"
                        className="refresh-button"
                        onClick={limparFiltros}
                      >
                        Limpar filtros
                      </button>
                    </div>
                  )
                  : (
                    usuariosFiltrados.map(
                      usuario => (
                        <article
                          key={usuario.id}
                          className="admin-user-card"
                        >
                          <div className="admin-user-avatar">
                            {
                              usuario.nome
                                .charAt(0)
                                .toUpperCase()
                            }
                          </div>

                          <div className="admin-user-info">
                            <strong>
                              {usuario.nome}
                            </strong>

                            <span>
                              {
                                usuario.email
                                ?? 'Sem e-mail'
                              }
                            </span>

                            <small>
                              Matrícula {usuario.matricula}
                              {' • '}
                              {usuario.perfil}
                              {' • '}
                              {
                                usuario.setor_nome
                                ?? 'Sem setor'
                              }
                            </small>
                          </div>

                          <div className="admin-user-actions">
                            <button
                              type="button"
                              className="admin-edit-button"
                              onClick={() =>
                                abrirEdicao(usuario)
                              }
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              className={
                                usuario.ativo
                                  ? 'admin-user-active'
                                  : 'admin-user-inactive'
                              }
                              onClick={() =>
                                void alterarStatus(usuario)
                              }
                            >
                              {
                                usuario.ativo
                                  ? 'ATIVO'
                                  : 'INATIVO'
                              }
                            </button>
                          </div>
                        </article>
                      )
                    )
                  )
            }
          </section>
        )
      }

      {
        aba === 'novo'
        && (
          <form
            className="admin-form"
            onSubmit={criarUsuario}
          >
            <h2>
              Novo usuário
            </h2>

            <label>
              Nome completo
            </label>

            <input
              type="text"
              value={nome}
              onChange={
                event =>
                  setNome(event.target.value)
              }
              required
            />

            <label>
              Matrícula
            </label>

            <input
              type="text"
              value={matricula}
              onChange={
                event =>
                  setMatricula(
                    event.target.value
                  )
              }
              required
            />

            <label>
              E-mail
            </label>

            <input
              type="email"
              value={email}
              onChange={
                event =>
                  setEmail(event.target.value)
              }
              required
            />

            <label>
              Senha inicial
            </label>

            <input
              type="password"
              value={senha}
              onChange={
                event =>
                  setSenha(event.target.value)
              }
              minLength={8}
              required
            />

            <label>
              Perfil
            </label>

            <select
              value={perfil}
              onChange={
                event =>
                  setPerfil(
                    converterPerfil(
                      event.target.value
                    )
                  )
              }
            >
              <option value="COLABORADOR">
                Colaborador
              </option>

              <option value="LIDER">
                Líder
              </option>

              <option value="ADMIN">
                Administrador
              </option>
            </select>

            <label>
              Setor
            </label>

            <select
              value={setorId}
              onChange={
                event =>
                  setSetorId(
                    event.target.value
                  )
              }
              required
            >
              <option value="">
                Selecione um setor
              </option>

              {
                setores
                  .filter(setor => setor.ativo)
                  .map(
                    setor => (
                      <option
                        key={setor.id}
                        value={setor.id}
                      >
                        {setor.nome}
                      </option>
                    )
                  )
              }
            </select>

            <button
              type="submit"
              className="primary-button"
              disabled={
                salvando
                || !setorId
              }
            >
              {
                salvando
                  ? 'Criando...'
                  : 'Criar usuário'
              }
            </button>
          </form>
        )
      }

      {
        aba === 'setores'
        && (
          <section>
            <form
              className="admin-form"
              onSubmit={criarSetor}
            >
              <h2>
                Novo setor
              </h2>

              <label>
                Nome do setor
              </label>

              <input
                type="text"
                value={novoSetor}
                onChange={
                  event =>
                    setNovoSetor(
                      event.target.value
                    )
                }
                placeholder="Ex.: Produção"
                required
              />

              <button
                type="submit"
                className="primary-button"
                disabled={salvando}
              >
                {
                  salvando
                    ? 'Salvando...'
                    : 'Criar setor'
                }
              </button>
            </form>

            <div className="admin-sector-list">
              {
                setores.map(
                  setor => (
                    <div
                      className="admin-sector-card"
                      key={setor.id}
                    >
                      <div>
                        <strong>
                          {setor.nome}
                        </strong>

                        <span>
                          {setor.total_usuarios}
                          {' usuário(s)'}
                        </span>
                      </div>

                      <small>
                        {
                          setor.ativo
                            ? 'ATIVO'
                            : 'INATIVO'
                        }
                      </small>

                        <button
                          type="button"
                          className="admin-delete-button"
                          onClick={() => void excluirSetor(setor)}
                          disabled={salvando}
                        >
                          Excluir
                        </button>
                    </div>
                  )
                )
              }
            </div>
          </section>
        )
      }

      {
        usuarioEditando
        && (
          <div
            className="admin-modal-backdrop"
            onMouseDown={
              event => {
                if (
                  event.target
                  === event.currentTarget
                ) {
                  fecharEdicao()
                }
              }
            }
          >
            <div className="admin-modal">
              <div className="admin-modal-header">
                <div>
                  <span>
                    EDITAR USUÁRIO
                  </span>

                  <h2>
                    {usuarioEditando.nome}
                  </h2>

                  <p>
                    {
                      usuarioEditando.email
                      ?? 'Sem e-mail'
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fecharEdicao}
                  aria-label="Fechar edição"
                >Fechar</button>
              </div>

              <form
                className="admin-edit-form"
                onSubmit={salvarEdicao}
              >
                <div className="admin-edit-section-title">
                  <span>
                    DADOS DO PERFIL
                  </span>

                  <strong>
                    Informações do colaborador
                  </strong>
                </div>

                <label>
                  Nome completo
                </label>

                <input
                  type="text"
                  value={editNome}
                  onChange={
                    event =>
                      setEditNome(
                        event.target.value
                      )
                  }
                  required
                />

                <label>
                  Matrícula
                </label>

                <input
                  type="text"
                  value={editMatricula}
                  onChange={
                    event =>
                      setEditMatricula(
                        event.target.value
                      )
                  }
                  required
                />

                <label>
                  Perfil
                </label>

                <select
                  value={editPerfil}
                  onChange={
                    event =>
                      setEditPerfil(
                        converterPerfil(
                          event.target.value
                        )
                      )
                  }
                >
                  <option value="COLABORADOR">
                    Colaborador
                  </option>

                  <option value="LIDER">
                    Líder
                  </option>

                  <option value="ADMIN">
                    Administrador
                  </option>
                </select>

                <label>
                  Setor
                </label>

                <select
                  value={editSetorId}
                  onChange={
                    event =>
                      setEditSetorId(
                        event.target.value
                      )
                  }
                  required
                >
                  <option value="">
                    Selecione um setor
                  </option>

                  {
                    setores
                      .filter(setor => setor.ativo)
                      .map(
                        setor => (
                          <option
                            key={setor.id}
                            value={setor.id}
                          >
                            {setor.nome}
                          </option>
                        )
                      )
                  }
                </select>

                <button
                  type="submit"
                  className="primary-button admin-save-profile"
                  disabled={
                    salvando
                    || !editSetorId
                  }
                >
                  {
                    salvando
                      ? 'Salvando perfil...'
                      : 'Salvar dados do perfil'
                  }
                </button>
              </form>

              <form
                className="admin-credentials-form"
                onSubmit={atualizarCredenciais}
              >
                <div className="admin-edit-section-title">
                  <span>
                    CREDENCIAIS DE ACESSO
                  </span>

                  <strong>
                    E-mail e senha
                  </strong>
                </div>

                <label>
                  E-mail de acesso
                </label>

                <input
                  type="email"
                  value={editEmail}
                  onChange={
                    event =>
                      setEditEmail(
                        event.target.value
                      )
                  }
                  required
                />

                <label>
                  Nova senha
                </label>

                <input
                  type="password"
                  value={editNovaSenha}
                  onChange={
                    event =>
                      setEditNovaSenha(
                        event.target.value
                      )
                  }
                  placeholder="Deixe vazio para manter a senha atual"
                  minLength={8}
                />

                <p className="admin-password-help">
                  A senha deve possuir pelo menos 8 caracteres.
                  Para alterar somente o e-mail, deixe a senha vazia.
                </p>

                <button
                  type="submit"
                  className="admin-credentials-button"
                  disabled={atualizandoCredenciais}
                >
                  {
                    atualizandoCredenciais
                      ? 'Atualizando credenciais...'
                      : 'Atualizar e-mail ou senha'
                  }
                </button>
              </form>

              <button
                type="button"
                className="leader-back-button admin-close-edit"
                onClick={fecharEdicao}
              >
                Fechar
              </button>
            </div>
          </div>
        )
      }

      {
        detalhesHuddleAberto
        && (
          <div
            className="huddle-detail-backdrop"
            onMouseDown={
              event => {
                if (
                  event.target
                  === event.currentTarget
                ) {
                  fecharDetalhesHuddle()
                }
              }
            }
          >
            <div className="huddle-detail-modal">
              <div className="huddle-detail-header">
                <div>
                  <span>
                    DETALHES DO HUDDLE
                  </span>

                  <h2>
                    {
                      detalhesHuddle?.huddle.titulo
                      ?? 'Carregando Huddle...'
                    }
                  </h2>

                  {
                    detalhesHuddle
                    && (
                      <p>
                        {detalhesHuddle.huddle.codigo}
                        {' • '}
                        {detalhesHuddle.huddle.setor_nome}
                        {' • '}
                        {
                          formatarDataBr(
                            detalhesHuddle.huddle.data_local
                          )
                        }
                      </p>
                    )
                  }
                </div>

                <button
                  type="button"
                  onClick={fecharDetalhesHuddle}
                  aria-label="Fechar detalhes do Huddle"
                >Fechar</button>
              </div>

              {
                detalhesHuddleLoading
                  ? (
                    <div className="huddle-detail-loading">
                      <div className="spinner" />

                      <p>
                        Carregando participantes...
                      </p>
                    </div>
                  )
                  : detalhesHuddleErro
                    ? (
                      <div className="huddle-detail-error">
                        <strong>
                          Não foi possível abrir o Huddle
                        </strong>

                        <p>
                          {detalhesHuddleErro}
                        </p>
                      </div>
                    )
                    : detalhesHuddle
                      ? (
                        <>
                          <section className="huddle-detail-info">
                            <div>
                              <span>
                                Responsável
                              </span>

                              <strong>
                                {
                                  detalhesHuddle
                                    .huddle
                                    .responsavel_nome
                                  ?? 'Não informado'
                                }
                              </strong>

                              <small>
                                Matrícula{' '}
                                {
                                  detalhesHuddle
                                    .huddle
                                    .responsavel_matricula
                                  ?? '—'
                                }
                              </small>
                            </div>

                            <div>
                              <span>
                                Início
                              </span>

                              <strong>
                                {
                                  formatarDataHora(
                                    detalhesHuddle
                                      .huddle
                                      .iniciado_em
                                  )
                                }
                              </strong>

                              <small>
                                Atraso após{' '}
                                {
                                  formatarHora(
                                    detalhesHuddle
                                      .huddle
                                      .atraso_apos
                                  )
                                }
                              </small>
                            </div>

                            <div>
                              <span>
                                Encerramento
                              </span>

                              <strong>
                                {
                                  formatarDataHora(
                                    detalhesHuddle
                                      .huddle
                                      .encerrado_em
                                  )
                                }
                              </strong>

                              <small>
                                Expiração{' '}
                                {
                                  formatarHora(
                                    detalhesHuddle
                                      .huddle
                                      .expira_em
                                  )
                                }
                              </small>
                            </div>

                            <div>
                              <span>
                                Status
                              </span>

                              <strong>
                                {
                                  formatarStatusHuddle(
                                    detalhesHuddle
                                      .huddle
                                      .status
                                  )
                                }
                              </strong>

                              <small>
                                Situação atual do registro
                              </small>
                            </div>
                          </section>

                          <section className="huddle-detail-kpis">
                            <article>
                              <span>
                                Esperados
                              </span>

                              <strong>
                                {
                                  detalhesHuddle
                                    .kpis
                                    .total_esperado
                                }
                              </strong>
                            </article>

                            <article>
                              <span>
                                Confirmados
                              </span>

                              <strong>
                                {
                                  detalhesHuddle
                                    .kpis
                                    .total_confirmado
                                }
                              </strong>
                            </article>

                            <article className="huddle-detail-kpi-green">
                              <span>
                                Presentes
                              </span>

                              <strong>
                                {
                                  detalhesHuddle
                                    .kpis
                                    .total_presentes
                                }
                              </strong>
                            </article>

                            <article className="huddle-detail-kpi-yellow">
                              <span>
                                Atrasados
                              </span>

                              <strong>
                                {
                                  detalhesHuddle
                                    .kpis
                                    .total_atrasados
                                }
                              </strong>
                            </article>

                            <article className="huddle-detail-kpi-red">
                              <span>
                                Ausentes
                              </span>

                              <strong>
                                {
                                  detalhesHuddle
                                    .kpis
                                    .total_ausentes
                                }
                              </strong>
                            </article>

                            <article className="huddle-detail-kpi-purple">
                              <span>
                                Participação
                              </span>

                              <strong>
                                {
                                  formatarPercentual(
                                    detalhesHuddle
                                      .kpis
                                      .taxa_participacao
                                  )
                                }%
                              </strong>
                            </article>
                          </section>

                          <section className="huddle-detail-participants">
                            <div className="huddle-detail-participants-header">
                              <div>
                                <span>
                                  PARTICIPANTES
                                </span>

                                <h3>
                                  Lista de presença
                                </h3>
                              </div>

                              <select
                                value={filtroParticipante}
                                onChange={
                                  event =>
                                    setFiltroParticipante(
                                      converterFiltroParticipante(
                                        event.target.value
                                      )
                                    )
                                }
                              >
                                <option value="TODOS">
                                  Todos
                                </option>

                                <option value="PRESENTE">
                                  Presentes
                                </option>

                                <option value="ATRASADO">
                                  Atrasados
                                </option>

                                <option value="AUSENTE">
                                  Ausentes
                                </option>
                              </select>
                            </div>

                            <div className="huddle-detail-filter-summary">
                              <span>
                                {
                                  participantesDetalhesFiltrados.length
                                }
                                {' participante(s) exibido(s)'}
                              </span>

                              <strong>
                                Pontualidade{' '}
                                {
                                  formatarPercentual(
                                    detalhesHuddle
                                      .kpis
                                      .taxa_pontualidade
                                  )
                                }%
                              </strong>
                            </div>

                            {
                              participantesDetalhesFiltrados.length === 0
                                ? (
                                  <div className="huddle-detail-empty">
                                    Nenhum participante encontrado neste filtro.
                                  </div>
                                )
                                : (
                                  <div className="huddle-detail-participant-list">
                                    {
                                      participantesDetalhesFiltrados.map(
                                        participante => (
                                          <article
                                            key={participante.user_id}
                                            className="huddle-detail-participant-row"
                                          >
                                            <div className="huddle-detail-participant-avatar">
                                              {
                                                iniciaisNome(
                                                  participante.nome
                                                )
                                              }
                                            </div>

                                            <div className="huddle-detail-participant-info">
                                              <strong>
                                                {participante.nome}
                                              </strong>

                                              <span>
                                                Matrícula{' '}
                                                {participante.matricula}
                                                {' • '}
                                                {participante.setor_nome}
                                              </span>

                                              <small>
                                                {
                                                  participante.status
                                                  === 'AUSENTE'
                                                    ? 'Sem confirmação registrada'
                                                    : `Confirmado em ${formatarDataHora(
                                                        participante.confirmado_em
                                                      )}`
                                                }
                                              </small>
                                            </div>

                                            <div className="huddle-detail-participant-meta">
                                              <span
                                                className={
                                                  classeStatusParticipante(
                                                    participante.status
                                                  )
                                                }
                                              >
                                                {
                                                  formatarStatusParticipante(
                                                    participante.status
                                                  )
                                                }
                                              </span>

                                              <small>
                                                {
                                                  participante.aceite
                                                    ? 'Aceite registrado'
                                                    : 'Sem aceite'
                                                }
                                              </small>
                                            </div>
                                          </article>
                                        )
                                      )
                                    }
                                  </div>
                                )
                            }
                          </section>

                          <button
                            type="button"
                            className="huddle-detail-close-button"
                            onClick={fecharDetalhesHuddle}
                          >
                            Fechar detalhes
                          </button>
                        </>
                      )
                      : null
              }
            </div>
          </div>
        )
      }
    </main>
  )
}