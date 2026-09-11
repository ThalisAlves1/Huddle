// @ts-ignore The Supabase Edge Functions runtime resolves npm imports.
import { createClient } from 'npm:@supabase/supabase-js@2'

declare const Deno: {
  env: {
    get(name: string): string | undefined
  }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
}

type PerfilUsuario =
  | 'COLABORADOR'
  | 'LIDER'
  | 'ADMIN'

type CriarUsuarioBody = {
  nome: string
  matricula: string
  email: string
  password: string
  perfil: PerfilUsuario
  setor_id: string
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    })
  }

  try {
    // ========================================================
    // VARIÁVEIS DE AMBIENTE
    // ========================================================

    const supabaseUrl =
      Deno.env.get('SUPABASE_URL')

    const serviceRole =
      Deno.env.get(
        'SUPABASE_SERVICE_ROLE_KEY'
      )

    const anonKey =
      Deno.env.get(
        'SUPABASE_ANON_KEY'
      )

    if (
      !supabaseUrl ||
      !serviceRole ||
      !anonKey
    ) {
      throw new Error(
        'Configuração do Supabase incompleta.'
      )
    }

    // ========================================================
    // AUTORIZAÇÃO
    // ========================================================

    const authHeader =
      request.headers.get(
        'Authorization'
      )

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error:
            'Usuário não autenticado.',
        }),
        {
          status: 401,

          headers: {
            ...corsHeaders,

            'Content-Type':
              'application/json',
          },
        }
      )
    }

    const token =
      authHeader.replace(
        'Bearer ',
        ''
      )

    // ========================================================
    // CLIENTE PARA VALIDAR USUÁRIO LOGADO
    // ========================================================

    const supabaseUser =
      createClient(
        supabaseUrl,
        anonKey,
        {
          auth: {
            autoRefreshToken:
              false,

            persistSession:
              false,
          },
        }
      )

    const {
      data: userData,
      error: userError,
    } =
      await supabaseUser.auth.getUser(
        token
      )

    if (
      userError ||
      !userData.user
    ) {
      return new Response(
        JSON.stringify({
          error:
            'Sessão inválida.',
        }),
        {
          status: 401,

          headers: {
            ...corsHeaders,

            'Content-Type':
              'application/json',
          },
        }
      )
    }

    // ========================================================
    // CLIENTE ADMIN
    // ========================================================

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        serviceRole,
        {
          auth: {
            autoRefreshToken:
              false,

            persistSession:
              false,
          },
        }
      )

    // ========================================================
    // VERIFICAR SE QUEM ESTÁ CRIANDO É ADMIN
    // ========================================================

    const {
      data: adminProfile,
      error: adminError,
    } =
      await supabaseAdmin
        .from('profiles')
        .select(
          'id, perfil, ativo'
        )
        .eq(
          'id',
          userData.user.id
        )
        .single()

    if (
      adminError ||
      !adminProfile
    ) {
      return new Response(
        JSON.stringify({
          error:
            'Perfil administrativo não encontrado.',
        }),
        {
          status: 403,

          headers: {
            ...corsHeaders,

            'Content-Type':
              'application/json',
          },
        }
      )
    }

    if (
      adminProfile.perfil !==
        'ADMIN' ||
      adminProfile.ativo !== true
    ) {
      return new Response(
        JSON.stringify({
          error:
            'Acesso permitido somente para administradores.',
        }),
        {
          status: 403,

          headers: {
            ...corsHeaders,

            'Content-Type':
              'application/json',
          },
        }
      )
    }

    // ========================================================
    // LER BODY
    // ========================================================

    const body =
      (await request.json()) as CriarUsuarioBody

    const nome =
      body.nome
        ?.trim()

    const matricula =
      body.matricula
        ?.trim()

    const email =
      body.email
        ?.trim()
        .toLowerCase()

    const password =
      body.password

    const perfil =
      body.perfil

    const setorId =
      body.setor_id

    // ========================================================
    // VALIDAÇÕES
    // ========================================================

    if (
      !nome ||
      nome.length < 2
    ) {
      throw new Error(
        'Nome inválido.'
      )
    }

    if (!matricula) {
      throw new Error(
        'Matrícula obrigatória.'
      )
    }

    if (
      !email ||
      !email.includes('@')
    ) {
      throw new Error(
        'E-mail inválido.'
      )
    }

    if (
      !password ||
      password.length < 8
    ) {
      throw new Error(
        'A senha deve possuir pelo menos 8 caracteres.'
      )
    }

    const perfisPermitidos:
      PerfilUsuario[] =
      [
        'COLABORADOR',
        'LIDER',
        'ADMIN',
      ]

    if (
      !perfisPermitidos.includes(
        perfil
      )
    ) {
      throw new Error(
        'Perfil inválido.'
      )
    }

    if (!setorId) {
      throw new Error(
        'Setor obrigatório.'
      )
    }

    // ========================================================
    // VALIDAR SETOR
    // ========================================================

    const {
      data: setor,
      error: setorError,
    } =
      await supabaseAdmin
        .from('setores')
        .select(
          'id, nome, ativo'
        )
        .eq(
          'id',
          setorId
        )
        .single()

    if (
      setorError ||
      !setor
    ) {
      throw new Error(
        'Setor não encontrado.'
      )
    }

    if (
      setor.ativo !== true
    ) {
      throw new Error(
        'O setor selecionado está inativo.'
      )
    }

    // ========================================================
    // VERIFICAR MATRÍCULA DUPLICADA
    // ========================================================

    const {
      data: matriculaExistente,
      error:
        matriculaCheckError,
    } =
      await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq(
          'matricula',
          matricula
        )
        .maybeSingle()

    if (
      matriculaCheckError
    ) {
      throw new Error(
        matriculaCheckError.message
      )
    }

    if (
      matriculaExistente
    ) {
      throw new Error(
        'Já existe um usuário com essa matrícula.'
      )
    }

    // ========================================================
    // CRIAR USUÁRIO NO AUTH
    // ========================================================

    const {
      data: novoUsuario,
      error: authError,
    } =
      await supabaseAdmin
        .auth
        .admin
        .createUser({
          email,
          password,

          email_confirm:
            true,

          user_metadata: {
            nome,
          },
        })

    if (
      authError ||
      !novoUsuario.user
    ) {
      throw new Error(
        authError?.message ||
        'Não foi possível criar a conta.'
      )
    }

    const novoUserId =
      novoUsuario.user.id

    // ========================================================
    // CRIAR PROFILE
    // ========================================================

    const {
      error: profileError,
    } =
      await supabaseAdmin
        .from('profiles')
        .insert({
          id:
            novoUserId,

          nome,

          matricula,

          perfil,

          setor_id:
            setorId,

          ativo:
            true,
        })

    if (profileError) {
      // Se o profile falhar,
      // remove a conta criada no Auth.

      await supabaseAdmin
        .auth
        .admin
        .deleteUser(
          novoUserId
        )

      throw new Error(
        profileError.message
      )
    }

    // ========================================================
    // RESPOSTA
    // ========================================================

    return new Response(
      JSON.stringify({
        success: true,

        message:
          'Usuário criado com sucesso.',

        user: {
          id:
            novoUserId,

          nome,

          matricula,

          email,

          perfil,

          setor_id:
            setorId,

          setor_nome:
            setor.nome,
        },
      }),
      {
        status: 200,

        headers: {
          ...corsHeaders,

          'Content-Type':
            'application/json',
        },
      }
    )
  } catch (error) {
    console.error(
      'admin-create-user:',
      error
    )

    const message =
      error instanceof Error
        ? error.message
        : 'Erro interno ao criar usuário.'

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 400,

        headers: {
          ...corsHeaders,

          'Content-Type':
            'application/json',
        },
      }
    )
  }
})