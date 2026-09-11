import {
  useNavigate,
} from 'react-router'


type Presenca = {

  presenca_id: string

  status:
    | 'PRESENTE'
    | 'ATRASADO'

  confirmado_em: string

  huddle_codigo: string

  mensagem: string
}


export function PresencaConfirmadaPage() {

  const navigate =
    useNavigate()


  const raw =
    sessionStorage
      .getItem(
        'ultima_presenca'
      )


  const presenca:
    Presenca | null =
      raw
        ? JSON.parse(raw)
        : null


  function formatarHora(
    valor?: string
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


  return (

    <main className="success-page">

      <section className="success-card">

        <div className="success-icon">
          ✓
        </div>

        <span className="success-label">
          TUDO CERTO
        </span>

        <h1>
          Presença registrada!
        </h1>

        <p>
          Sua participação foi
          registrada com sucesso.
        </p>


        {presenca && (

          <div className="success-details">

            <div>

              <span>
                Status
              </span>

              <strong>
                {presenca.status}
              </strong>

            </div>


            <div>

              <span>
                Horário
              </span>

              <strong>
                {
                  formatarHora(
                    presenca
                      .confirmado_em
                  )
                }
              </strong>

            </div>


            <div>

              <span>
                Huddle
              </span>

              <strong>
                {
                  presenca
                    .huddle_codigo
                }
              </strong>

            </div>

          </div>

        )}


        <div className="digital-proof">

          🔒 Registro realizado
          utilizando sua conta
          autenticada.

        </div>


        <button

          className="primary-button"

          onClick={() => {

            sessionStorage
              .removeItem(
                'ultima_presenca'
              )

            navigate(
              '/',
              {
                replace: true,
              }
            )

          }}

        >

          Voltar ao início

        </button>

      </section>

    </main>

  )
}