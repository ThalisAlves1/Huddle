import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router'

import {
  supabase,
} from '../lib/supabase'


type HuddleValidado = {

  huddle_id: string

  codigo: string

  titulo: string

  setor_nome: string

  data_local: string

  iniciado_em: string

  expira_em: string

  ja_confirmado: boolean
}


export function ConfirmarPresencaPage() {

  const navigate =
    useNavigate()


  const [
    huddle,
    setHuddle,
  ] =
    useState<HuddleValidado | null>(
      null
    )


  const [
    aceite,
    setAceite,
  ] =
    useState(false)


  const [
    loading,
    setLoading,
  ] =
    useState(true)


  const [
    confirmando,
    setConfirmando,
  ] =
    useState(false)


  const [
    erro,
    setErro,
  ] =
    useState('')


  const validarNovamente = useCallback(async () => {

    const payload =
      sessionStorage
        .getItem(
          'huddle_qr_payload'
        )


    if (!payload) {

      navigate(
        '/',
        {
          replace: true,
        }
      )

      return
    }


    const {
      data,
      error,
    } =
      await supabase
        .rpc(
          'validar_qr_huddle',
          {
            p_payload:
              payload,
          }
        )
        .single()


    if (error) {

      setErro(
        error.message
      )

      setLoading(false)

      return
    }


    setHuddle(
      data as HuddleValidado
    )

    setLoading(false)

  }, [navigate])


  useEffect(() => {

    // A validação remota inicializa os dados exibidos nesta rota.
    // oxlint-disable-next-line react/set-state-in-effect
    void validarNovamente()

  }, [validarNovamente])


  async function confirmar() {

    if (!aceite) {

      setErro(
        'Marque a confirmação de participação.'
      )

      return
    }


    const payload =
      sessionStorage
        .getItem(
          'huddle_qr_payload'
        )


    if (!payload) {
      return
    }


    try {

      setConfirmando(true)
      setErro('')


      const {
        data,
        error,
      } =
        await supabase
          .rpc(
            'confirmar_presenca_huddle',
            {
              p_payload:
                payload,

              p_aceite:
                true,
            }
          )
          .single()


      if (error) {
        throw error
      }


      sessionStorage
        .setItem(
          'ultima_presenca',
          JSON.stringify(
            data
          )
        )


      sessionStorage
        .removeItem(
          'huddle_qr_payload'
        )


      sessionStorage
        .removeItem(
          'huddle_validado'
        )


      navigate(
        '/presenca-confirmada',
        {
          replace: true,
        }
      )

    } catch (error) {

      console.error(
        error
      )


      const mensagem =
        error instanceof Error
          ? error.message
          : 'Não foi possível confirmar a presença.'


      setErro(
        mensagem
      )

    } finally {

      setConfirmando(false)

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
    valor: string
  ) {

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


  if (loading) {

    return (

      <div className="loading-page">

        <div className="spinner" />

        <p>
          Validando QR...
        </p>

      </div>

    )

  }


  if (erro && !huddle) {

    return (

      <main className="confirmation-page">

        <section className="invalid-qr">

          <div>
            ⚠️
          </div>

          <h2>
            Não foi possível
            validar
          </h2>

          <p>
            {erro}
          </p>

          <button
            className="primary-button"

            onClick={() =>
              navigate(
                '/scanner'
              )
            }
          >
            Ler outro QR
          </button>

        </section>

      </main>

    )

  }


  if (!huddle) {
    return null
  }


  return (

    <main className="confirmation-page">

      <header className="confirmation-header">

        <button
          onClick={() =>
            navigate(
              '/scanner'
            )
          }
        >
          ←
        </button>

        <div>

          <span>
            QR VALIDADO
          </span>

          <h1>
            Confirmar presença
          </h1>

        </div>

      </header>


      <section className="validated-box">

        <div className="validated-icon">
          ✓
        </div>

        <div>

          <strong>
            QR Code válido
          </strong>

          <p>
            Código reconhecido
            pelo sistema
          </p>

        </div>

      </section>


      <section className="confirmation-card">

        <h2>
          {huddle.titulo}
        </h2>


        <span className="confirmation-code">
          {huddle.codigo}
        </span>


        <div className="confirmation-data">

          <div>

            <span>
              Setor
            </span>

            <strong>
              {huddle.setor_nome}
            </strong>

          </div>


          <div>

            <span>
              Data
            </span>

            <strong>
              {
                formatarData(
                  huddle.data_local
                )
              }
            </strong>

          </div>


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

        </div>


        {huddle.ja_confirmado ? (

          <div className="already-confirmed">

            ✓ Sua presença já
            foi registrada.

          </div>

        ) : (

          <>

            <label className="acceptance-box">

              <input

                type="checkbox"

                checked={aceite}

                onChange={
                  event =>
                    setAceite(
                      event
                        .target
                        .checked
                    )
                }

              />


              <span>

                Declaro que participei
                do Huddle e recebi as
                orientações
                apresentadas.

              </span>

            </label>


            {erro && (

              <div className="scanner-error">
                ⚠️ {erro}
              </div>

            )}


            <button

              className="primary-button confirmation-button"

              disabled={
                !aceite
                ||
                confirmando
              }

              onClick={
                confirmar
              }

            >

              {
                confirmando
                  ? 'Confirmando...'
                  : 'Confirmar presença'
              }

            </button>

          </>

        )}

      </section>

    </main>

  )
}
