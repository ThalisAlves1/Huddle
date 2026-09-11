import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router'

import {
  Html5Qrcode,
} from 'html5-qrcode'

import {
  supabase,
} from '../lib/supabase'


export function ScannerPage() {

  const navigate =
    useNavigate()


  const scannerRef =
    useRef<Html5Qrcode | null>(
      null
    )


  const leituraBloqueadaRef =
    useRef(false)


  const cameraAtivaRef =
    useRef(false)


  const [
    cameraAtiva,
    setCameraAtiva,
  ] =
    useState(false)


  const [
    iniciando,
    setIniciando,
  ] =
    useState(false)


  const [
    validando,
    setValidando,
  ] =
    useState(false)


  const [
    erro,
    setErro,
  ] =
    useState('')


  const [
    mensagem,
    setMensagem,
  ] =
    useState(
      'Toque no botão abaixo para ativar a câmera.'
    )


  useEffect(() => {

    return () => {

      void pararCamera()

    }

  }, [])


  async function iniciarCamera() {

    if (
      cameraAtivaRef.current
      ||
      iniciando
    ) {
      return
    }


    try {

      setIniciando(true)

      setErro('')

      setMensagem(
        'Solicitando acesso à câmera...'
      )


      console.log(
        'Iniciando scanner...'
      )


      const scanner =
        new Html5Qrcode(
          'qr-reader'
        )


      scannerRef.current =
        scanner


      await scanner.start(

        {
          facingMode:
            'environment',
        },

        {
          fps: 10,

          qrbox: {
            width: 250,
            height: 250,
          },

          aspectRatio:
            1,
        },


        async (
          decodedText
        ) => {

          await qrEncontrado(
            decodedText
          )

        },


        () => {

          // Enquanto não encontrar
          // um QR válido, erros de
          // leitura são ignorados.

        }

      )


      cameraAtivaRef.current =
        true


      setCameraAtiva(
        true
      )


      setMensagem(
        'Aponte a câmera para o QR Code apresentado pelo líder.'
      )


      console.log(
        'Câmera iniciada.'
      )

    } catch (error) {

      console.error(
        'ERRO AO ABRIR CÂMERA:',
        error
      )


      scannerRef.current =
        null


      cameraAtivaRef.current =
        false


      setCameraAtiva(
        false
      )


      setErro(
        'Não foi possível acessar a câmera. Verifique a permissão da câmera no navegador.'
      )


      setMensagem(
        'Libere a câmera e tente novamente.'
      )

    } finally {

      setIniciando(false)

    }

  }


  async function pararCamera() {

    const scanner =
      scannerRef.current


    if (!scanner) {
      return
    }


    try {

      if (
        cameraAtivaRef.current
      ) {

        await scanner.stop()

      }

    } catch (error) {

      console.log(
        'Scanner já estava parado:',
        error
      )

    }


    try {

      scanner.clear()

    } catch {
      // Ignorar erro de limpeza.
    }


    scannerRef.current =
      null


    cameraAtivaRef.current =
      false


    setCameraAtiva(
      false
    )

  }


  async function qrEncontrado(
    decodedText: string
  ) {

    if (
      leituraBloqueadaRef.current
    ) {
      return
    }


    leituraBloqueadaRef.current =
      true


    setValidando(
      true
    )


    setErro('')


    setMensagem(
      'QR encontrado. Validando...'
    )


    try {

      if (
        scannerRef.current
        &&
        cameraAtivaRef.current
      ) {

        try {

          scannerRef.current
            .pause(
              true
            )

        } catch {
          // scanner pode já estar pausado
        }

      }


      console.log(
        'QR lido:',
        decodedText
      )


      const {
        data,
        error,
      } =
        await supabase
          .rpc(
            'validar_qr_huddle',
            {
              p_payload:
                decodedText,
            }
          )
          .single()


      if (error) {
        throw error
      }


      console.log(
        'QR validado:',
        data
      )


      sessionStorage
        .setItem(
          'huddle_qr_payload',
          decodedText
        )


      sessionStorage
        .setItem(
          'huddle_validado',
          JSON.stringify(
            data
          )
        )


      await pararCamera()


      navigate(
        '/confirmar-presenca'
      )

    } catch (error) {

      console.error(
        'Erro ao validar QR:',
        error
      )


      let mensagemErro =
        'QR Code inválido.'


      if (
        error
        &&
        typeof error === 'object'
        &&
        'message' in error
      ) {

        mensagemErro =
          String(
            error.message
          )

      }


      setErro(
        mensagemErro
      )


      setMensagem(
        'Tente posicionar outro QR Code.'
      )


      leituraBloqueadaRef.current =
        false


      if (
        scannerRef.current
        &&
        cameraAtivaRef.current
      ) {

        try {

          scannerRef.current
            .resume()

        } catch {
          // Ignorar.
        }

      }

    } finally {

      setValidando(
        false
      )

    }

  }


  async function voltar() {

    await pararCamera()

    navigate(
      '/colaborador'
    )

  }


  return (

    <main className="scanner-page">


      <header className="scanner-header">


        <button
          type="button"
          onClick={voltar}
        >

          ←

        </button>


        <div>

          <h1>

            Ler QR Code

          </h1>


          <p>

            Registre sua presença
            no Huddle

          </p>

        </div>


      </header>


      <section className="scanner-card">


        <div
          id="qr-reader"
          className="qr-reader"
        />


        {
          !cameraAtiva
          &&
          !iniciando
          &&
          (

            <div
              style={{
                padding:
                  '35px 15px',

                textAlign:
                  'center',
              }}
            >

              <div
                style={{
                  fontSize:
                    '48px',

                  marginBottom:
                    '15px',
                }}
              >

                📷

              </div>


              <h2
                style={{
                  fontSize:
                    '18px',
                }}
              >

                Câmera desligada

              </h2>


              <p
                style={{
                  marginTop:
                    '8px',

                  fontSize:
                    '12px',

                  color:
                    '#667085',
                }}
              >

                Precisamos acessar
                sua câmera para ler
                o QR Code.

              </p>


              <button
                type="button"
                className="primary-button"
                onClick={iniciarCamera}

                style={{
                  width:
                    '100%',

                  marginTop:
                    '20px',
                }}
              >

                📷 Ativar câmera

              </button>

            </div>

          )
        }


        {
          iniciando
          &&
          (

            <div className="scanner-loading">

              <div className="spinner" />

              <p>

                Abrindo câmera...

              </p>

            </div>

          )
        }


        {
          cameraAtiva
          &&
          (

            <div className="scanner-frame-info">

              <span>
                ▦
              </span>

              {
                validando
                  ? 'Validando QR Code...'
                  : 'Posicione o QR Code dentro da câmera'
              }

            </div>

          )
        }


        {
          mensagem
          &&
          (

            <p
              style={{
                textAlign:
                  'center',

                marginTop:
                  '15px',

                fontSize:
                  '11px',

                color:
                  '#667085',

                lineHeight:
                  '1.5',
              }}
            >

              {mensagem}

            </p>

          )
        }


        {
          erro
          &&
          (

            <div className="scanner-error">

              ⚠️ {erro}

            </div>

          )
        }


        {
          cameraAtiva
          &&
          (

            <button
              type="button"

              onClick={
                pararCamera
              }

              style={{
                width:
                  '100%',

                marginTop:
                  '15px',

                padding:
                  '12px',

                borderRadius:
                  '10px',

                border:
                  '1px solid #d0d5dd',

                background:
                  '#ffffff',

                color:
                  '#344054',

                fontWeight:
                  '600',
              }}
            >

              Desligar câmera

            </button>

          )
        }


      </section>


      <section className="scanner-security">

        🔒 O QR Code será validado
        pelo servidor antes de sua
        presença ser confirmada.

      </section>


    </main>

  )

}