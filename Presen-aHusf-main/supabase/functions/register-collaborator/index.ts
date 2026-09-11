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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type CadastroBody = {
  nome: string
  matricula: string
  email: string
  password: string
  setor_id: string
}

function resposta(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return resposta({ error: 'Método não permitido.' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Configuração do Supabase incompleta.')
    }

    const body = (await request.json()) as CadastroBody
    const nome = body.nome?.trim()
    const matricula = body.matricula?.trim()
    const email = body.email?.trim().toLowerCase()
    const password = body.password
    const setorId = body.setor_id

    if (!nome || nome.length < 2) {
      throw new Error('Nome inválido.')
    }

    if (!matricula) {
      throw new Error('Matrícula obrigatória.')
    }

    if (!email || !email.includes('@')) {
      throw new Error('E-mail inválido.')
    }

    if (!password || password.length < 8) {
      throw new Error('A senha deve possuir pelo menos 8 caracteres.')
    }

    if (!setorId) {
      throw new Error('Setor obrigatório.')
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: setor, error: setorError } = await supabaseAdmin
      .from('setores')
      .select('id, nome, ativo')
      .eq('id', setorId)
      .single()

    if (setorError || !setor || setor.ativo !== true) {
      throw new Error('Setor não encontrado ou inativo.')
    }

    const { data: matriculaExistente, error: matriculaError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('matricula', matricula)
      .maybeSingle()

    if (matriculaError) {
      throw new Error(matriculaError.message)
    }

    if (matriculaExistente) {
      throw new Error('Já existe um usuário com essa matrícula.')
    }

    const { data: novoUsuario, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nome,
        matricula,
        perfil: 'COLABORADOR',
        setor_id: setorId,
      },
    })

    if (authError || !novoUsuario.user) {
      throw new Error(authError?.message || 'Não foi possível criar a conta.')
    }

    const userId = novoUsuario.user.id
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        nome,
        matricula,
        email,
        perfil: 'COLABORADOR',
        setor_id: setorId,
        ativo: true,
      }, { onConflict: 'id' })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw new Error(profileError.message)
    }

    return resposta({
      success: true,
      message: 'Cadastro realizado com sucesso.',
    })
  } catch (error) {
    console.error('register-collaborator:', error)
    return resposta({
      success: false,
      error: error instanceof Error ? error.message : 'Não foi possível realizar o cadastro.',
    }, 400)
  }
})
