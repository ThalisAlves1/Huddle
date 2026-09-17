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

import {
  useAuth,
} from '../hooks/useAuth'


type PerfilUsuario =
  | 'COLABORADOR'
  | 'LIDER'
  | 'ADMIN'


type Profile = {
  id: string
  nome: string
  matricula: string
  perfil: PerfilUsuario
  ativo: boolean
}


export function EntryPage() {

  const navigate =
    useNavigate()

  const {
    user,
  } =
    useAuth()

  const [
    erro,
    setErro,
  ] =
    useState('')


  const carregarPerfil = useCallback(async () => {

    if (!user) {
      return
    }


    try {

      setErro('')


      const {
        data,
        error,
      } =
        await supabase
          .from('profiles')
          .select(
            'id, nome, matricula, perfil, ativo'
          )
          .eq(
            'id',
            user.id
          )
          .single()


      if (error) {
        throw error
      }


      const profile =
        data as Profile


      console.log(
        'Perfil encontrado:',
        profile
      )


      if (!profile.ativo) {

        setErro(
          'Sua conta está inativa.'
        )

        return

      }


      // ==========================================
      // ADMINISTRADOR
      // ==========================================

      if (
        profile.perfil ===
        'ADMIN'
      ) {

        console.log(
          'Entrando como ADMIN'
        )

        navigate(
          '/admin',
          {
            replace: true,
          }
        )

        return
      }


      // ==========================================
      // LÍDER
      // ==========================================

      if (
        profile.perfil ===
        'LIDER'
      ) {

        console.log(
          'Entrando como LIDER'
        )

        navigate(
          '/lider',
          {
            replace: true,
          }
        )

        return
      }


      // ==========================================
      // COLABORADOR
      // ==========================================

      if (
        profile.perfil ===
        'COLABORADOR'
      ) {

        console.log(
          'Entrando como COLABORADOR'
        )

        navigate(
          '/colaborador',
          {
            replace: true,
          }
        )

        return
      }


      setErro(
        'Perfil de usuário inválido.'
      )


    } catch (error) {

      console.error(
        'Erro ao carregar perfil:',
        error
      )


      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível identificar o usuário.'
      )

    }

  }, [navigate, user])


  useEffect(() => {

    if (!user) {
      return
    }

    // A consulta externa inicializa o estado da rota após a autenticação.
    // oxlint-disable-next-line react/set-state-in-effect
    void carregarPerfil()

  }, [carregarPerfil, user])


  if (erro) {

    return (

      <main className="loading-page">

        <div>

          <h2>
            Não foi possível acessar
          </h2>

          <p>
            {erro}
          </p>

        </div>

      </main>

    )

  }


  return (

    <div className="loading-page">

      <div className="spinner" />

      <p>
        Identificando seu perfil...
      </p>

    </div>

  )

}
