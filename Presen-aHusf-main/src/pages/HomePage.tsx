import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router'

import {
  useAuth,
} from '../contexts/AuthContext'

import {
  supabase,
} from '../lib/supabase'

import logoHorizontal from '../assets/logo-huddle-horizontal.png'

import '../styles/home-collaborator.css'

type HomeData = {
  nome: string
  matricula: string
  perfil: 'COLABORADOR' | 'LIDER' | 'ADMIN'
  setor_id: string | null
  setor_nome: string | null
  huddle_id: string | null
  huddle_codigo: string | null
  huddle_titulo: string | null
  huddle_status:
    | 'AGENDADO'
    | 'EM_ANDAMENTO'
    | 'ENCERRADO'
    | 'CANCELADO'
    | null
  huddle_data: string | null
  iniciado_em: string | null
  atraso_apos: string | null
  expira_em: string | null

  presenca_id: string | null
  presenca_status:
    | 'PRESENTE'
    | 'ATRASADO'
    | null
  confirmado_em: string | null
}

function Icon({
  type,
}: {
  type:
    | 'user'
    | 'calendar'
    | 'clock'
    | 'qr'
    | 'building'
    | 'refresh'
    | 'logout'
}) {
  if (type === 'user') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c.8-4.6 3.4-7 8-7s7.2 2.4 8 7" />
      </svg>
    )
  }

  if (type === 'calendar') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3v3M18 3v3M4 8h16" />
        <rect x="4" y="5" width="16" height="16" rx="3" />
      </svg>
    )
  }

  if (type === 'clock') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    )
  }

  if (type === 'building') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 21V5h10v16M15 10h4v11" />
        <path d="M8 9h4M8 13h4M8 17h4" />
      </svg>
    )
  }

  if (type === 'refresh') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 7v5h-5" />
        <path d="M18.2 17a8 8 0 1 1 .5-9.5L20 12" />
      </svg>
    )
  }

  if (type === 'logout') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 5H5v14h5" />
        <path d="M14 8l4 4-4 4M18 12H9" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3v-3Zm5 0h2v7h-2v-7Zm-5 5h3v2h-3v-2Z" />
    </svg>
  )
}

export function HomePage() {
  const navigate = useNavigate()

  const {
    user,
    logout,
  } = useAuth()

  const [
    dados,
    setDados,
  ] = useState<HomeData | null>(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    erro,
    setErro,
  ] = useState('')

  useEffect(() => {
    if (user) {
      void carregarHome()
    }
  }, [user])

  async function carregarHome() {
    try {
      setLoading(true)
      setErro('')

      const {
        data,
        error,
      } = await supabase
        .rpc('get_home_colaborador')
        .single()

      if (error) {
        throw error
      }

      setDados(
        data as HomeData
      )
    } catch (error) {
      console.error(
        'Erro ao carregar Home:',
        error
      )

      setErro(
        'Não foi possível carregar seus dados.'
      )
    } finally {
      setLoading(false)
    }
  }

  function formatarData(
    data: string | null
  ) {
    if (!data) {
      return '—'
    }

    const [
      ano,
      mes,
      dia,
    ] = data.split('-')

    return `${dia}/${mes}/${ano}`
  }

  function formatarHora(
    data: string | null
  ) {
    if (!data) {
      return '—'
    }

    return new Intl.DateTimeFormat(
      'pt-BR',
      {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      }
    ).format(
      new Date(data)
    )
  }

  function primeiroNome() {
    return (
      dados?.nome
        ?.trim()
        .split(/\s+/)[0]
      ?? 'Colaborador'
    )
  }

  function statusHuddle() {
    if (dados?.huddle_status === 'AGENDADO') {
      return 'Agendado'
    }

    if (dados?.huddle_status === 'ENCERRADO') {
      return 'Encerrado'
    }

    if (dados?.huddle_status === 'CANCELADO') {
      return 'Cancelado'
    }

    return 'Em andamento'
  }


  function presencaRegistrada() {
    return Boolean(
      dados?.presenca_id
    )
  }

  function tituloPresenca() {
    if (
      dados?.presenca_status
      === 'ATRASADO'
    ) {
      return 'Presença registrada com atraso'
    }

    return 'Presença registrada'
  }

  if (loading) {
    return (
      <div className="loading-page home-v3-loading">
        <div className="spinner" />
        <p>Procurando seu Huddle...</p>
      </div>
    )
  }

  if (erro) {
    return (
      <main className="home-page-v3">
        <section className="home-v3-state">
          <div className="home-v3-state-icon">
            <Icon type="refresh" />
          </div>

          <span>CONEXÃO</span>

          <h2>
            Não foi possível carregar
          </h2>

          <p>{erro}</p>

          <button
            type="button"
            onClick={() =>
              void carregarHome()
            }
          >
            Tentar novamente
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="home-page-v3">
      <div className="home-v3-shell">
        <header className="home-v3-topbar">
          <img
            src={logoHorizontal}
            alt="Huddle - Hospital Universitário Sagrada Família"
            className="home-v3-logo"
          />

          <button
            type="button"
            className="home-v3-icon-button"
            onClick={logout}
            title="Sair"
            aria-label="Sair"
          >
            <Icon type="logout" />
          </button>
        </header>

        <section className="home-v3-profile">
          <div className="home-v3-avatar">
            <Icon type="user" />
          </div>

          <div>
            <span>
              Olá, {primeiroNome()}
            </span>

            <h1>
              {dados?.nome ?? 'Colaborador'}
            </h1>

            <p>
              Matrícula {dados?.matricula ?? '—'}
              <b />
              {dados?.setor_nome ?? 'Sem setor'}
            </p>
          </div>
        </section>

        <div className="home-v3-heading">
          <div>
            <span>HOJE</span>
            <h2>Huddle do dia</h2>
          </div>

          <button
            type="button"
            className="home-v3-icon-button"
            onClick={() =>
              void carregarHome()
            }
            title="Atualizar"
            aria-label="Atualizar"
          >
            <Icon type="refresh" />
          </button>
        </div>

        {
          dados?.huddle_id
            ? (
              <section className="home-v3-huddle">
                <div className="home-v3-accent" />

                <div className="home-v3-huddle-header">
                  <div className="home-v3-huddle-icon">
                    <Icon type="user" />
                  </div>

                  <div>
                    <span>HUDDLE ATIVO</span>

                    <h3>
                      {
                        dados.huddle_titulo
                        ?? 'Huddle Diário'
                      }
                    </h3>
                  </div>

                  <small>
                    {statusHuddle()}
                  </small>
                </div>

                <div className="home-v3-details">
                  <article>
                    <i>
                      <Icon type="calendar" />
                    </i>

                    <div>
                      <span>Data</span>

                      <strong>
                        {
                          formatarData(
                            dados.huddle_data
                          )
                        }
                      </strong>
                    </div>
                  </article>

                  <article>
                    <i>
                      <Icon type="clock" />
                    </i>

                    <div>
                      <span>Horário</span>

                      <strong>
                        {
                          formatarHora(
                            dados.iniciado_em
                          )
                        }
                      </strong>
                    </div>
                  </article>

                  <article>
                    <i>
                      <Icon type="building" />
                    </i>

                    <div>
                      <span>Seu setor</span>

                      <strong>
                        {
                          dados.setor_nome
                          ?? '—'
                        }
                      </strong>
                    </div>
                  </article>

                  <article>
                    <i>
                      <Icon type="qr" />
                    </i>

                    <div>
                      <span>
                        Código do Huddle
                      </span>

                      <strong className="home-v3-code">
                        {
                          dados.huddle_codigo
                          ?? '—'
                        }
                      </strong>
                    </div>
                  </article>
                </div>

                {
                  presencaRegistrada()
                    ? (
                      <div className="home-v3-presence-confirmed">
                        <div className="home-v3-presence-symbol">
                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path d="M5 12.5 10 17l9-10" />
                          </svg>
                        </div>

                        <div className="home-v3-presence-copy">
                          <span>
                            PRESENÇA CONFIRMADA
                          </span>

                          <strong>
                            {tituloPresenca()}
                          </strong>

                          <p>
                            Registro realizado às{' '}
                            <b>
                              {
                                formatarHora(
                                  dados.confirmado_em
                                )
                              }
                            </b>
                            .
                          </p>
                        </div>

                        <div
                          className={
                            dados.presenca_status
                            === 'ATRASADO'
                              ? 'home-v3-presence-badge home-v3-presence-badge-late'
                              : 'home-v3-presence-badge'
                          }
                        >
                          {
                            dados.presenca_status
                            === 'ATRASADO'
                              ? 'Atrasado'
                              : 'Presente'
                          }
                        </div>
                      </div>
                    )
                    : (
                      <div className="home-v3-scan">
                        <div>
                          <span>
                            REGISTRO DE PRESENÇA
                          </span>

                          <strong>
                            Escaneie o QR Code apresentado pelo líder.
                          </strong>

                          <p>
                            O processo leva apenas alguns segundos.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            navigate('/scanner')
                          }
                        >
                          <Icon type="qr" />

                          <span>
                            Ler QR Code
                          </span>
                        </button>
                      </div>
                    )
                }
              </section>
            )
            : (
              <section className="home-v3-state">
                <div className="home-v3-state-icon">
                  <Icon type="calendar" />
                </div>

                <span>HUDDLE</span>

                <h2>
                  Nenhum Huddle ativo
                </h2>

                <p>
                  Não existe um Huddle disponível neste momento.
                  Quando um novo Huddle for iniciado, ele aparecerá aqui.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void carregarHome()
                  }
                >
                  Atualizar
                </button>
              </section>
            )
        }

        <section className="home-v3-link-card">
          <div>
            <Icon type="building" />
          </div>

          <section>
            <span>VÍNCULO ATUAL</span>

            <strong>
              {
                dados?.setor_nome
                ?? 'Sem setor'
              }
            </strong>

            <p>
              Seu cadastro está ativo e pronto para registrar presença.
            </p>
          </section>
        </section>

        <footer className="home-v3-footer">
          Huddle
          <span />
          Hospital Universitário Sagrada Família
        </footer>
      </div>
    </main>
  )
}