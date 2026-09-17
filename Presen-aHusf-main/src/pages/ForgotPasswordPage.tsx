import {
  useState,
  type FormEvent,
} from 'react'

import {
  Link,
} from 'react-router'

import {
  supabase,
} from '../lib/supabase'

import logoVertical from '../assets/logo-huddle-vertical.png'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)

  async function solicitarRecuperacao(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (loading) {
      return
    }

    setLoading(true)
    setErro('')

    const redirectTo =
      new URL(
        '/redefinir-senha',
        window.location.origin
      ).toString()

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo }
      )

    setLoading(false)

    if (error) {
      console.error(
        'Erro ao solicitar recuperação de senha:',
        error
      )

      setErro(
        error.message.toLowerCase().includes('rate')
          ? 'Aguarde um pouco antes de solicitar outro e-mail.'
          : 'Não foi possível enviar o e-mail agora. Tente novamente.'
      )

      return
    }

    setEnviado(true)
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
        <div className="login-title">
          <h2>Recuperar senha</h2>

          <p>
            Informe seu e-mail para receber um link seguro de redefinição.
          </p>
        </div>

        {enviado ? (
          <>
            <div className="success-box" role="status">
              Se existir uma conta com esse e-mail, enviaremos as instruções de recuperação. Verifique também a pasta de spam.
            </div>

            <p className="auth-switch">
              <Link to="/login">Voltar para o login</Link>
            </p>
          </>
        ) : (
          <form onSubmit={solicitarRecuperacao}>
            <label htmlFor="recovery-email">
              E-mail
            </label>

            <input
              id="recovery-email"
              type="email"
              placeholder="nome@empresa.com"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoComplete="email"
              required
            />

            {erro && (
              <div className="error-box" role="alert">
                {erro}
              </div>
            )}

            <button
              className="primary-button"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>

            <p className="auth-switch">
              <Link to="/login">Voltar para o login</Link>
            </p>
          </form>
        )}
      </section>

      <p className="security-text">
        Ambiente seguro
      </p>
    </main>
  )
}
