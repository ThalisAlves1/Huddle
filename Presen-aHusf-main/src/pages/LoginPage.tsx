import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import {
  useNavigate,
} from 'react-router'

import {
  Link,
} from 'react-router'

import {
  supabase,
  supabaseConfigurado,
} from '../lib/supabase'

import {
  useAuth,
} from '../hooks/useAuth'

import logoVertical from '../assets/logo-huddle-vertical.png'

import '../styles/login-video-transition.css'


type Perfil =
  | 'COLABORADOR'
  | 'LIDER'
  | 'ADMIN'


function rotaPorPerfil(
  perfil: Perfil | string | null | undefined
) {
  if (perfil === 'ADMIN') {
    return '/admin'
  }

  if (perfil === 'LIDER') {
    return '/lider'
  }

  return '/colaborador'
}


export function LoginPage() {
  const navigate =
    useNavigate()

  const {
    user,
    loading: authLoading,
  } =
    useAuth()

  const [
    email,
    setEmail,
  ] =
    useState('')

  const [
    senha,
    setSenha,
  ] =
    useState('')

  const [
    loading,
    setLoading,
  ] =
    useState(false)

  const [
    erro,
    setErro,
  ] =
    useState('')

  const [
    videoAtivo,
    setVideoAtivo,
  ] =
    useState(false)

  const [
    videoFinalizado,
    setVideoFinalizado,
  ] =
    useState(false)

  const [
    destino,
    setDestino,
  ] =
    useState<string | null>(
      null
    )


  useEffect(() => {
    if (
      authLoading
      || !user
      || loading
      || videoAtivo
    ) {
      return
    }

    const usuarioAtual = user
    let cancelado = false

    async function redirecionarSessaoExistente() {
      const rota =
        await obterDestino(
          usuarioAtual.id,
          usuarioAtual.user_metadata?.perfil
        )

      if (!cancelado) {
        navigate(
          rota,
          {
            replace: true,
          }
        )
      }
    }

    void redirecionarSessaoExistente()

    return () => {
      cancelado = true
    }
  }, [
    authLoading,
    user,
    loading,
    videoAtivo,
    navigate,
  ])


  useEffect(() => {
    if (
      videoFinalizado
      && destino
    ) {
      navigate(
        destino,
        {
          replace: true,
        }
      )
    }
  }, [
    videoFinalizado,
    destino,
    navigate,
  ])


  useEffect(() => {
    if (!videoAtivo) {
      return
    }

    const fallback =
      window.setTimeout(
        () => {
          setVideoFinalizado(true)
        },
        5500
      )

    return () => {
      window.clearTimeout(
        fallback
      )
    }
  }, [videoAtivo])


  async function obterDestino(
    userId: string,
    perfilMetadata?: string
  ) {
    try {
      const {
        data,
        error,
      } =
        await supabase
          .rpc(
            'get_home_colaborador'
          )
          .single()

      if (
        !error
        && data
        && typeof data === 'object'
        && 'perfil' in data
      ) {
        return rotaPorPerfil(
          String(data.perfil)
        )
      }
    } catch (error) {
      console.warn(
        'Não foi possível obter o perfil pela RPC:',
        error
      )
    }


    try {
      const {
        data,
        error,
      } =
        await supabase
          .from('profiles')
          .select('perfil')
          .eq(
            'id',
            userId
          )
          .single()

      if (
        !error
        && data?.perfil
      ) {
        return rotaPorPerfil(
          data.perfil
        )
      }
    } catch (error) {
      console.warn(
        'Não foi possível obter o perfil diretamente:',
        error
      )
    }


    return rotaPorPerfil(
      perfilMetadata
    )
  }


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (loading) {
      return
    }

    setLoading(true)
    setErro('')

    const {
      data,
      error,
    } =
      await supabase
        .auth
        .signInWithPassword({
          email:
            email
              .trim()
              .toLowerCase(),

          password:
            senha,
        })


    if (
      error
      || !data.user
    ) {
      console.error(
        error
      )

      setErro(
        'E-mail ou senha incorretos.'
      )

      setLoading(false)

      return
    }


    /*
     * A autenticação já foi concluída.
     * Agora exibimos a animação antes de abrir o painel.
     */
    setVideoFinalizado(false)
    setVideoAtivo(true)


    const rota =
      await obterDestino(
        data.user.id,
        data.user.user_metadata?.perfil
      )

    setDestino(
      rota
    )
  }


  if (videoAtivo) {
    return (
      <main
        className="login-video-transition"
        aria-label="Carregando Huddle"
      >
        <div className="login-video-stage">
          <video
            className="login-transition-video"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={() =>
              setVideoFinalizado(
                true
              )
            }
            onError={() =>
              setVideoFinalizado(
                true
              )
            }
          >
            <source
              src="/huddle-login.mp4"
              type="video/mp4"
            />
          </video>
        </div>

        <div className="login-video-status">
          <span />

          <p>
            Preparando seu ambiente...
          </p>
        </div>
      </main>
    )
  }


  if (
    authLoading
    || (
      user
      && !loading
    )
  ) {
    return (
      <div className="loading-page">
        <div className="spinner" />

        <p>
          Abrindo o Huddle...
        </p>
      </div>
    )
  }


  return (
    <main className="login-page">
      <section className="brand">
        <img
          src={logoVertical}
          alt="Huddle - Hospital Universitário Sagrada Família"
          className="brand-logo"
        />

        <p className="brand-subtitle">
          Presença digital
        </p>
      </section>


      <section className="login-card">
        {
          !supabaseConfigurado
          && (
            <div
              className="config-box"
              role="alert"
            >
              Configure o arquivo <strong>.env.local</strong> com as chaves do Supabase para acessar o sistema.
            </div>
          )
        }

        <div className="login-title">
          <h2>
            Bem-vindo
          </h2>

          <p>
            Entre na sua conta para
            registrar sua participação
            no Huddle diário.
          </p>
        </div>


        <form
          onSubmit={handleSubmit}
        >
          <label
            htmlFor="login-email"
          >
            E-mail
          </label>

          <input
            id="login-email"
            type="email"
            placeholder="nome@empresa.com"
            value={email}
            onChange={
              event =>
                setEmail(
                  event.target.value
                )
            }
            autoComplete="email"
            required
          />


          <label
            htmlFor="login-senha"
          >
            Senha
          </label>

          <input
            id="login-senha"
            type="password"
            placeholder="Digite sua senha"
            value={senha}
            onChange={
              event =>
                setSenha(
                  event.target.value
                )
            }
            autoComplete="current-password"
            required
          />


          {
            erro
            && (
              <div
                className="error-box"
                role="alert"
              >
                {erro}
              </div>
            )
          }


          <button
            className="primary-button"
            type="submit"
            disabled={loading}
          >
            {
              loading
                ? 'Entrando...'
                : 'Entrar'
            }
          </button>
        </form>

        <p className="auth-switch">
          Ainda não possui uma conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </section>


      <p className="security-text">
        Ambiente seguro
      </p>
    </main>
  )
}
