import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router'

import {
  supabase,
} from '../lib/supabase'


type HuddleHistorico = {

  huddle_id: string

  codigo: string

  titulo: string

  setor_nome: string

  data_local: string

  status:
    | 'AGENDADO'
    | 'EM_ANDAMENTO'
    | 'ENCERRADO'
    | 'CANCELADO'

  iniciado_em: string | null

  encerrado_em: string | null

  total_esperado: number

  total_confirmado: number

  total_presentes: number

  total_atrasados: number

  taxa_participacao:
    number | string
}


export function HistoryPage() {

  const navigate =
    useNavigate()


  const [
    huddles,
    setHuddles,
  ] =
    useState<HuddleHistorico[]>(
      []
    )


  const [
    loading,
    setLoading,
  ] =
    useState(true)


  const [
    erro,
    setErro,
  ] =
    useState('')


  useEffect(() => {

    carregarHistorico()

  }, [])


  async function carregarHistorico() {

    try {

      setLoading(true)

      setErro('')


      const {
        data,
        error,
      } =
        await supabase
          .rpc(
            'get_historico_huddles_lider',
            {
              p_limite: 100,
            }
          )


      if (error) {
        throw error
      }


      setHuddles(
        (
          data
          ??
          []
        ) as HuddleHistorico[]
      )

    } catch (error) {

      console.error(
        error
      )


      setErro(
        'Não foi possível carregar o histórico.'
      )

    } finally {

      setLoading(false)

    }

  }


  function formatarData(
    valor: string
  ) {

    const [
      ano,
      mes,
      dia,
    ] =
      valor.split('-')


    return `${dia}/${mes}/${ano}`

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

          timeZone:
            'America/Sao_Paulo',
        }
      )
      .format(
        new Date(valor)
      )

  }


  function nomeStatus(
    status: string
  ) {

    switch (status) {

      case 'EM_ANDAMENTO':
        return 'Em andamento'

      case 'ENCERRADO':
        return 'Encerrado'

      case 'CANCELADO':
        return 'Cancelado'

      case 'AGENDADO':
        return 'Agendado'

      default:
        return status

    }

  }


  if (loading) {

    return (

      <div className="loading-page">

        <div className="spinner" />

        <p>
          Carregando histórico...
        </p>

      </div>

    )

  }


  return (

    <main className="history-page">


      <header className="history-header">

        <button
          type="button"
          onClick={() =>
            navigate(
              '/lider'
            )
          }
        >
          ←
        </button>


        <div>

          <span>
            AUDITORIA
          </span>

          <h1>
            Histórico de Huddles
          </h1>

          <p>
            Consulte registros anteriores
          </p>

        </div>

      </header>


      {erro && (

        <div className="scanner-error">

          ⚠️ {erro}

        </div>

      )}


      <section className="history-summary">

        <span>
          HUDDLES ENCONTRADOS
        </span>

        <strong>
          {huddles.length}
        </strong>

      </section>


      {huddles.length === 0 ? (

        <section className="history-empty">

          <div>
            ◷
          </div>

          <h2>
            Nenhum Huddle encontrado
          </h2>

          <p>
            Os Huddles realizados
            aparecerão aqui.
          </p>

        </section>

      ) : (

        <section className="history-list">

          {huddles.map(
            huddle => (

              <button
                type="button"
                className="history-card"
                key={huddle.huddle_id}
                onClick={() =>
                  navigate(
                    `/lider/historico/${huddle.huddle_id}`
                  )
                }
              >

                <div className="history-card-top">

                  <div>

                    <span className="history-date">

                      {
                        formatarData(
                          huddle.data_local
                        )
                      }

                    </span>


                    <h2>
                      {huddle.titulo}
                    </h2>


                    <p>
                      {huddle.codigo}
                    </p>

                  </div>


                  <span
                    className={
                      huddle.status ===
                      'ENCERRADO'
                        ? 'history-status history-status-closed'
                        : 'history-status'
                    }
                  >

                    {
                      nomeStatus(
                        huddle.status
                      )
                    }

                  </span>

                </div>


                <div className="history-times">

                  <div>

                    <span>
                      Início
                    </span>

                    <strong>

                      {
                        formatarHora(
                          huddle.iniciado_em
                        )
                      }

                    </strong>

                  </div>


                  <div>

                    <span>
                      Encerramento
                    </span>

                    <strong>

                      {
                        formatarHora(
                          huddle.encerrado_em
                        )
                      }

                    </strong>

                  </div>

                </div>


                <div className="history-numbers">

                  <div>

                    <span>
                      Participação
                    </span>

                    <strong>

                      {
                        huddle.total_confirmado
                      }
                      /
                      {
                        huddle.total_esperado
                      }

                    </strong>

                  </div>


                  <div>

                    <span>
                      Presença
                    </span>

                    <strong>

                      {
                        Number(
                          huddle.taxa_participacao
                        ).toFixed(1)
                      }%

                    </strong>

                  </div>


                  <div>

                    <span>
                      Atrasos
                    </span>

                    <strong>

                      {
                        huddle.total_atrasados
                      }

                    </strong>

                  </div>

                </div>


                <div className="history-view">

                  Ver evidências →

                </div>

              </button>

            )
          )}

        </section>

      )}


      <button
        type="button"
        className="refresh-button history-refresh"
        onClick={carregarHistorico}
      >

        Atualizar histórico

      </button>


    </main>

  )

}