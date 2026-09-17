import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router'

import {
  supabase,
} from '../lib/supabase'

import logoVertical from '../assets/logo-huddle-vertical.png'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [verificando, setVerificando] = useState(true)
  const [linkValido, setLinkValido] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let ativo = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          ativo
          && (
            event === 'PASSWORD_RECOVERY'
            || session
          )
        ) {
          setLinkValido(true)
          setVerificando(false)
        }
      }
    )

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!ativo) {
        return
      }

      setLinkValido(Boolean(data.session) && !error)
      setVerificando(false)
    })

    return () => {
      ativo = false
      subscription.unsubscribe()
    }
  }, [])

  async function redefinirSenha(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    if (salvando) {
      return
    }

    if (senha.length < 8) {
      setErro('A nova senha deve possuir pelo menos 8 caracteres.')
      return
    }

    if (senha !== confirmacao) {
      setErro('As senhas não conferem.')
      return
    }

    setSalvando(true)
    setErro('')

    const { error } =
      await supabase.auth.updateUser({
        password: senha,
      })

    if (error) {
      console.error(
        'Erro ao redefinir senha:',
        error
      )

      setErro(
        'Não foi possível redefinir a senha. Solicite um novo link.'
      )
      setSalvando(false)
      return
    }

    await supabase.auth.signOut()

    navigate(
      '/login?senha=alterada',
      { replace: true }
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
        <div className="login-title">
          <h2>Definir nova senha</h2>

          <p>
            Escolha uma senha segura com pelo menos 8 caracteres.
          </p>
        </div>

        {verificando ? (
          <div className="loading-inline" role="status">
            Validando o link...
          </div>
        ) : !linkValido ? (
          <>
            <div className="error-box" role="alert">
              Este link é inválido ou expirou. Solicite uma nova recuperação de senha.
            </div>

            <p className="auth-switch">
              <Link to="/esqueci-senha">Solicitar novo link</Link>
            </p>
          </>
        ) : (
          <form onSubmit={redefinirSenha}>
            <label htmlFor="nova-senha">
              Nova senha
            </label>

            <input
              id="nova-senha"
              type="password"
              value={senha}
              onChange={event => setSenha(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />

            <label htmlFor="confirmar-nova-senha">
              Confirmar nova senha
            </label>

            <input
              id="confirmar-nova-senha"
              type="password"
              value={confirmacao}
              onChange={event => setConfirmacao(event.target.value)}
              autoComplete="new-password"
              minLength={8}
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
              disabled={salvando}
            >
              {salvando ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </section>

      <p className="security-text">
        Ambiente seguro
      </p>
    </main>
  )
}
