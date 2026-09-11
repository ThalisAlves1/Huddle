import {
  createClient,
} from 'npm:@supabase/supabase-js@2'


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',

  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
}


type AtualizarAuthBody = {
  user_id: string
  email?: string
  password?: string
}


type AuthAttributes = {
  email?: string
  password?: string
  email_confirm?: boolean
}


function respostaJson(
  body: Record<string, unknown>,
  status: number
) {

  return new Response(
    JSON.stringify(body),
    {
      status,

      headers: {
        ...corsHeaders,

        'Content-Type':
          'application/json',
      },
    }
  )

}


Deno.serve(
  async request => {

    // ========================================================
    // CORS
    // ========================================================

    if (
      request.method ===
      'OPTIONS'
    ) {

      return new Response(
        'ok',
        {
          headers:
            corsHeaders,
        }
      )

    }


    if (
      request.method !==
      'POST'
    ) {

      return respostaJson(
        {
          success: false,

          error:
            'Método não permitido.',
        },
        405
      )

    }


    try {

      // ======================================================
      // VARIÁVEIS DO SUPABASE
      // ======================================================

      const supabaseUrl =
        Deno.env.get(
          'SUPABASE_URL'
        )


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


      // ======================================================
      // TOKEN DO USUÁRIO LOGADO
      // ======================================================

      const authHeader =
        request.headers.get(
          'Authorization'
        )


      if (!authHeader) {

        return respostaJson(
          {
            success: false,

            error:
              'Usuário não autenticado.',
          },
          401
        )

      }


      if (
        !authHeader.startsWith(
          'Bearer '
        )
      ) {

        return respostaJson(
          {
            success: false,

            error:
              'Token de autenticação inválido.',
          },
          401
        )

      }


      const token =
        authHeader.substring(
          7
        )


      // ======================================================
      // CLIENTE PARA VALIDAR A SESSÃO
      // ======================================================

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
        await supabaseUser
          .auth
          .getUser(
            token
          )


      if (
        userError ||
        !userData.user
      ) {

        console.error(
          'Sessão inválida:',
          userError
        )


        return respostaJson(
          {
            success: false,

            error:
              'Sessão inválida ou expirada.',
          },
          401
        )

      }


      // ======================================================
      // CLIENTE COM SERVICE ROLE
      // ======================================================

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


      // ======================================================
      // VALIDAR PERFIL ADMIN
      // ======================================================

      const {
        data: adminProfile,
        error: adminError,
      } =
        await supabaseAdmin
          .from(
            'profiles'
          )
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

        console.error(
          'Perfil administrativo:',
          adminError
        )


        return respostaJson(
          {
            success: false,

            error:
              'Perfil administrativo não encontrado.',
          },
          403
        )

      }


      if (
        adminProfile.perfil !==
          'ADMIN' ||
        adminProfile.ativo !==
          true
      ) {

        return respostaJson(
          {
            success: false,

            error:
              'Acesso permitido somente para administradores ativos.',
          },
          403
        )

      }


      // ======================================================
      // LER BODY
      // Sem usar "as AtualizarAuthBody"
      // ======================================================

      const body:
        AtualizarAuthBody =
        await request.json()


      const userId =
        body.user_id
          ?.trim()


      const email =
        body.email
          ?.trim()
          .toLowerCase()


      const password =
        body.password
          ?.trim()


      if (!userId) {

        throw new Error(
          'Usuário não informado.'
        )

      }


      // ======================================================
      // LOCALIZAR CONTA NO AUTH
      // ======================================================

      const {
        data: targetUserData,
        error: targetUserError,
      } =
        await supabaseAdmin
          .auth
          .admin
          .getUserById(
            userId
          )


      if (
        targetUserError ||
        !targetUserData.user
      ) {

        console.error(
          'Usuário Auth:',
          targetUserError
        )


        throw new Error(
          'Usuário não encontrado no Supabase Auth.'
        )

      }


      const targetUser =
        targetUserData.user


      // ======================================================
      // PREPARAR ALTERAÇÕES
      // ======================================================

      const attributes:
        AuthAttributes = {}


      if (email) {

        if (
          !email.includes('@') ||
          email.startsWith('@') ||
          email.endsWith('@')
        ) {

          throw new Error(
            'E-mail inválido.'
          )

        }


        const emailAtual =
          targetUser.email
            ?.trim()
            .toLowerCase()
          ??
          ''


        if (
          email !==
          emailAtual
        ) {

          attributes.email =
            email


          attributes.email_confirm =
            true

        }

      }


      if (password) {

        if (
          password.length < 8
        ) {

          throw new Error(
            'A nova senha deve possuir pelo menos 8 caracteres.'
          )

        }


        attributes.password =
          password

      }


      if (
        Object.keys(
          attributes
        ).length === 0
      ) {

        throw new Error(
          'Nenhuma alteração de e-mail ou senha foi informada.'
        )

      }


      // ======================================================
      // ATUALIZAR SUPABASE AUTH
      // ======================================================

      const {
        data: updatedUserData,
        error: updateError,
      } =
        await supabaseAdmin
          .auth
          .admin
          .updateUserById(
            userId,
            attributes
          )


      if (
        updateError ||
        !updatedUserData.user
      ) {

        console.error(
          'Erro ao atualizar Auth:',
          updateError
        )


        throw new Error(
          updateError?.message ||
          'Não foi possível atualizar as credenciais.'
        )

      }


      // ======================================================
      // RESPOSTA
      // ======================================================

      return respostaJson(
        {
          success: true,

          message:
            'Credenciais atualizadas com sucesso.',

          user: {
            id:
              updatedUserData.user.id,

            email:
              updatedUserData.user.email,
          },
        },
        200
      )


    } catch (error) {

      console.error(
        'admin-update-auth:',
        error
      )


      const message =
        error instanceof Error
          ? error.message
          : 'Erro interno ao atualizar as credenciais.'


      return respostaJson(
        {
          success: false,

          error:
            message,
        },
        400
      )

    }

  }
)