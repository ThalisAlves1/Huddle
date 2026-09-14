import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router'

import QRCode
  from 'qrcode'

import {
  supabase,
} from '../lib/supabase'

import {
  useAuth,
} from '../contexts/AuthContext'


type Painel = {

  nome: string

  perfil:
    | 'LIDER'
    | 'ADMIN'

  setor_id: string

  setor_nome: string

  huddle_id: string | null

  codigo: string | null

  titulo: string | null

  status: string | null

  iniciado_em: string | null

  expira_em: string | null

  qr_payload: string | null

  total_esperado: number | null

  total_confirmado: number | null

  total_presentes: number | null

  total_atrasados: number | null
}


type Participante = {

  user_id: string

  nome: string

  matricula: string

  setor_nome: string | null

  status:
    | 'PRESENTE'
    | 'ATRASADO'
    | null

  confirmado_em: string | null
}


export function LeaderPage() {

  const navigate =
    useNavigate()


  const {
    logout,
  } =
    useAuth()


  const [
    painel,
    setPainel,
  ] =
    useState<Painel | null>(
      null
    )


  const [
    participantes,
    setParticipantes,
  ] =
    useState<Participante[]>(
      []
    )


  const [
    qrImagem,
    setQrImagem,
  ] =
    useState('')


  const [
    loading,
    setLoading,
  ] =
    useState(true)


  const [
    iniciando,
    setIniciando,
  ] =
    useState(false)


  const [
    encerrando,
    setEncerrando,
  ] =
    useState(false)


  const [
    erro,
    setErro,
  ] =
    useState('')


  useEffect(() => {

    carregarPainel()


    const intervalo =
      window.setInterval(
        () => {
          carregarPainel(
            false
          )
        },
        3000
      )


    return () => {

      window.clearInterval(
        intervalo
      )

    }

  }, [])

  useEffect(() => {

  if (!painel?.huddle_id) {
    return
  }


  const huddleId =
    painel.huddle_id


  console.log(
    'Realtime iniciado para:',
    huddleId
  )


  const channel =
    supabase
      .channel(
        `presencas-${huddleId}`
      )

      .on(
        'postgres_changes',

        {
          event:
            'INSERT',

          schema:
            'public',

          table:
            'presencas',

          filter:
            `huddle_id=eq.${huddleId}`,
        },

        async payload => {

          console.log(
            'Nova presença recebida:',
            payload
          )


          await carregarPainel(
            false
          )

        }
      )

      .subscribe(
        status => {

          console.log(
            'Status Realtime:',
            status
          )

        }
      )


  return () => {

    console.log(
      'Encerrando canal Realtime'
    )


    void supabase
      .removeChannel(
        channel
      )

  }

}, [painel?.huddle_id])


  async function carregarPainel(
    mostrarLoading = true
  ) {

    try {

      if (mostrarLoading) {
        setLoading(true)
      }


      const {
        data,
        error,
      } =
        await supabase
          .rpc(
            'get_painel_lider'
          )
          .single()


      if (error) {
        throw error
      }


      const novoPainel =
        data as Painel


      setPainel(
        novoPainel
      )


      if (
        novoPainel
          .qr_payload
      ) {

        const imagem =
          await QRCode
            .toDataURL(
              novoPainel
                .qr_payload,
              {
                width: 500,

                margin: 2,
              }
            )


        setQrImagem(
          imagem
        )

      } else {

        setQrImagem('')

      }


      if (
        novoPainel
          .huddle_id
      ) {

        await carregarParticipantes(
          novoPainel
            .huddle_id
        )

      } else {

        setParticipantes(
          []
        )

      }

    } catch (error) {

      console.error(
        error
      )


      if (mostrarLoading) {

        setErro(
          'Não foi possível carregar o painel.'
        )

      }

    } finally {

      if (mostrarLoading) {
        setLoading(false)
      }

    }

  }


  async function carregarParticipantes(
    huddleId: string
  ) {

    const {
      data,
      error,
    } =
      await supabase
        .rpc(
          'get_participantes_huddle_lider',
          {
            p_huddle_id:
              huddleId,
          }
        )


    if (error) {

      console.error(
        error
      )

      return
    }


    setParticipantes(
      (
        data
        ||
        []
      ) as Participante[]
    )

  }


  async function iniciarHuddle() {

    try {

      setIniciando(
        true
      )

      setErro('')


      const {
        error,
      } =
        await supabase
          .rpc(
            'criar_huddle_lider',
            {
              p_duracao_minutos:
                30,

              p_atraso_apos_minutos:
                10,
            }
          )
          .single()


      if (error) {
        throw error
      }


      await carregarPainel(
        false
      )

    } catch (error) {

      const mensagem =
        error instanceof Error
          ? error.message
          : typeof error === 'object'
            && error !== null
            && 'message' in error
            ? String(error.message)
            : 'Não foi possível iniciar o Huddle.'


      setErro(
        mensagem
      )

    } finally {

      setIniciando(
        false
      )

    }

  }


  async function encerrarHuddle() {

    if (
      !painel?.huddle_id
    ) {
      return
    }


    try {

      setEncerrando(
        true
      )

      setErro('')


      const {
        error,
      } =
        await supabase
          .rpc(
            'encerrar_huddle_lider',
            {
              p_huddle_id:
                painel
                  .huddle_id,
            }
          )


      if (error) {
        throw error
      }


      await carregarPainel(
        false
      )

    } catch (error) {

      const mensagem =
        error instanceof Error
          ? error.message
          : 'Não foi possível encerrar o Huddle.'


      setErro(
        mensagem
      )

    } finally {

      setEncerrando(
        false
      )

    }

  }


  function formatarHora(
    valor: string | null
  ) {

    if (!valor) {
      return '—'
    }


    return new Intl
      .DateTimeFormat(
        'pt-BR',
        {
          hour:
            '2-digit',

          minute:
            '2-digit',

          second:
            '2-digit',

          timeZone:
            'America/Sao_Paulo',
        }
      )
      .format(
        new Date(valor)
      )

  }


  if (loading) {

    return (

      <div className="loading-page">

        <div className="spinner" />

        <p>
          Carregando painel...
        </p>

      </div>

    )

  }


  return (

    <main className="leader-page">


      <header className="leader-header">

        <div>

          <span>
            ÁREA DO LÍDER
          </span>

          <h1>
            {painel?.nome}
          </h1>

          <p>
            {
              painel
                ?.setor_nome
            }
          </p>

        </div>
        <button
  type="button"
  className="leader-history-button"
  onClick={() =>
    navigate(
      '/lider/historico'
    )
  }
>
  <span>
    ◷
  </span>

  Ver histórico de Huddles

  <strong>
    →
  </strong>
</button>


        <button
          onClick={logout}
          className="avatar"
          title="Sair"
        >

          {
            painel
              ?.nome
              ?.charAt(0)
          }

        </button>

      </header>


      {erro && (

        <div className="scanner-error">

          ⚠️ {erro}

        </div>

      )}


      {!painel?.huddle_id ? (

        <section className="leader-empty">

          <div className="leader-empty-icon">
            👥
          </div>

          <h2>
            Nenhum Huddle ativo
          </h2>

          <p>
            Inicie o Huddle diário
            quando a equipe estiver
            reunida.
          </p>


          <button
            className="primary-button leader-start-button"

            disabled={
              iniciando
            }

            onClick={
              iniciarHuddle
            }
          >

            {
              iniciando
                ? 'Iniciando...'
                : 'Iniciar Huddle'
            }

          </button>

        </section>

      ) : (

        <>

          <section className="leader-status-card">

            <div>

              <span>
                HUDDLE EM ANDAMENTO
              </span>

              <h2>
                {
                  painel
                    .codigo
                }
              </h2>

              <p>
                Iniciado às{' '}
                {
                  formatarHora(
                    painel
                      .iniciado_em
                  )
                }
              </p>

            </div>


            <div className="live-badge">
              ● AO VIVO
            </div>

          </section>


          <section className="leader-numbers">

            <div>

              <span>
                Confirmados
              </span>

              <strong>

                {
                  painel
                    .total_confirmado
                  ??
                  0
                }

                /

                {
                  painel
                    .total_esperado
                  ??
                  0
                }

              </strong>

            </div>


            <div>

              <span>
                No horário
              </span>

              <strong>

                {
                  painel
                    .total_presentes
                  ??
                  0
                }

              </strong>

            </div>


            <div>

              <span>
                Atrasados
              </span>

              <strong>

                {
                  painel
                    .total_atrasados
                  ??
                  0
                }

              </strong>

            </div>

          </section>


          <section className="leader-qr-card">

            <h2>
              Escaneie para registrar
              presença
            </h2>

            <p>
              QR exclusivo deste
              Huddle
            </p>


            {
              qrImagem
              &&
              (
                <img

                  src={
                    qrImagem
                  }

                  alt="QR Code do Huddle"

                  className="leader-qr"

                />
              )
            }


            <span className="qr-expiration">

              Válido até{' '}

              {
                formatarHora(
                  painel
                    .expira_em
                )
              }

            </span>

          </section>


          <section className="participants-card">

            <div className="participants-header">

              <div>

                <span>
                  PARTICIPANTES
                </span>

                <h2>
                  Presença da equipe
                </h2>

              </div>


              <strong>

                {
                  painel
                    .total_confirmado
                  ??
                  0
                }

                /

                {
                  painel
                    .total_esperado
                  ??
                  0
                }

              </strong>

            </div>


            <div className="participants-list">

              {
                participantes
                  .map(
                    participante => (

                      <div
                        className="participant-row"
                        key={
                          participante
                            .user_id
                        }
                      >

                        <div className="participant-avatar">

                          {
                            participante
                              .nome
                              .charAt(0)
                              .toUpperCase()
                          }

                        </div>


                        <div className="participant-info">

                          <strong>
                            {
                              participante
                                .nome
                            }
                          </strong>

                          <span>

                            Setor{' '}
                            {
                              participante
                                .setor_nome
                              ||
                              'Sem setor'
                            }
                            {' - '}

                            Matrícula{' '}
                            {
                              participante
                                .matricula
                            }
                          </span>

                        </div>


                        {
                          participante
                            .status
                          ? (

                            <div className="participant-confirmed">

                              ✓

                              <span>

                                {
                                  formatarHora(
                                    participante
                                      .confirmado_em
                                  )
                                }

                              </span>

                            </div>

                          )
                          : (

                            <span className="participant-pending">
                              Pendente
                            </span>

                          )
                        }

                      </div>

                    )
                  )
              }

            </div>

          </section>


          <button
            className="end-huddle-button"

            disabled={
              encerrando
            }

            onClick={
              encerrarHuddle
            }
          >

            {
              encerrando
                ? 'Encerrando...'
                : 'Encerrar Huddle'
            }

          </button>

        </>

      )}


      <button
        className="leader-back-button"

        onClick={() =>
          navigate('/')
        }
      >
        Atualizar painel
      </button>


    </main>

  )
}