import {
  useEffect,
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


type Setor = {
  id: string
  nome: string
}


export function CadastroPage() {
  const [nome, setNome] = useState('')
  const [matricula, setMatricula] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('')
  const [setorId, setSetorId] = useState('')
  const [setores, setSetores] = useState<Setor[]>([])
  const [carregandoSetores, setCarregandoSetores] = useState(true)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    async function carregarSetores() {
      const { data, error } = await supabase
        .from('setores')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')

      if (error) {
        setErro('Não foi possível carregar os setores.')
      } else {
        setSetores(data ?? [])
      }

      setCarregandoSetores(false)
    }

    void carregarSetores()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (loading) {
      return
    }

    setErro('')
    setSucesso('')

    if (senha.length < 8) {
      setErro('A senha deve possuir pelo menos 8 caracteres.')
      return
    }

    if (senha !== confirmacaoSenha) {
      setErro('As senhas não conferem.')
      return
    }

    if (!setorId) {
      setErro('Selecione o seu setor.')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke(
        'register-collaborator',
        {
          body: {
            nome: nome.trim(),
            matricula: matricula.trim(),
            email: email.trim().toLowerCase(),
            password: senha,
            setor_id: setorId,
          },
        }
      )

      if (error) {
        throw error
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Não foi possível realizar o cadastro.')
      }

      setSucesso('Cadastro realizado. Agora entre com seu e-mail e senha.')

      setNome('')
      setMatricula('')
      setEmail('')
      setSenha('')
      setConfirmacaoSenha('')
      setSetorId('')
    } catch (error) {
      console.error('Erro ao realizar cadastro:', error)
      setErro(error instanceof Error ? error.message : 'Não foi possível realizar o cadastro.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page cadastro-page">
      <section className="brand">
        <img
          src={logoVertical}
          alt="Huddle - Hospital Universitário Sagrada Família"
          className="brand-logo"
        />

        <p className="brand-subtitle">Presença digital</p>
      </section>

      <section className="login-card cadastro-card">
        <div className="login-title">
          <h2>Crie seu acesso</h2>
          <p>Cadastre-se para participar do Huddle diário.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="cadastro-nome">Nome completo</label>
          <input
            id="cadastro-nome"
            type="text"
            placeholder="Digite seu nome"
            value={nome}
            onChange={event => setNome(event.target.value)}
            autoComplete="name"
            required
          />

          <label htmlFor="cadastro-matricula">Matrícula</label>
          <input
            id="cadastro-matricula"
            type="text"
            placeholder="Digite sua matrícula"
            value={matricula}
            onChange={event => setMatricula(event.target.value)}
            required
          />

          <label htmlFor="cadastro-setor">Setor</label>
          <select
            id="cadastro-setor"
            value={setorId}
            onChange={event => setSetorId(event.target.value)}
            disabled={carregandoSetores}
            required
          >
            <option value="">
              {carregandoSetores ? 'Carregando setores...' : 'Selecione seu setor'}
            </option>
            {setores.map(setor => (
              <option key={setor.id} value={setor.id}>
                {setor.nome}
              </option>
            ))}
          </select>

          <label htmlFor="cadastro-email">E-mail</label>
          <input
            id="cadastro-email"
            type="email"
            placeholder="nome@empresa.com"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            required
          />

          <label htmlFor="cadastro-senha">Senha</label>
          <input
            id="cadastro-senha"
            type="password"
            placeholder="Mínimo de 8 caracteres"
            value={senha}
            onChange={event => setSenha(event.target.value)}
            autoComplete="new-password"
            required
          />

          <label htmlFor="cadastro-confirmacao">Confirmar senha</label>
          <input
            id="cadastro-confirmacao"
            type="password"
            placeholder="Repita sua senha"
            value={confirmacaoSenha}
            onChange={event => setConfirmacaoSenha(event.target.value)}
            autoComplete="new-password"
            required
          />

          {erro && (
            <div className="error-box" role="alert">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="success-box" role="status">
              {sucesso}
            </div>
          )}

          <button className="primary-button" type="submit" disabled={loading || carregandoSetores}>
            {loading ? 'Criando acesso...' : 'Criar meu acesso'}
          </button>
        </form>

        <p className="auth-switch">
          Já possui uma conta? <Link to="/login">Entrar</Link>
        </p>
      </section>

      <p className="security-text">Ambiente seguro</p>
    </main>
  )
}
