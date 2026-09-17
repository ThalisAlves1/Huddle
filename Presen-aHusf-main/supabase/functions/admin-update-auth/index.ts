import {
  createClient,
} from '@supabase/supabase-js'


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


function escaparHtml(valor: string) {

  return valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

}


async function enviarAvisoAlteracaoSenha(
  destinatario: string,
  nome: string
) {

  const resendApiKey =
    Deno.env.get(
      'RESEND_API_KEY'
    )


  const resendFromEmail =
    Deno.env.get(
      'RESEND_FROM_EMAIL'
    )


  if (
    !resendApiKey ||
    !resendFromEmail
  ) {

    throw new Error(
      'Resend não configurado. Defina RESEND_API_KEY e RESEND_FROM_EMAIL.'
    )

  }


  const nomeSeguro =
    escaparHtml(
      nome
    )


  const alteradoEm =
    new Intl.DateTimeFormat(
      'pt-BR',
      {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo',
      }
    ).format(
      new Date()
    )


  const response =
    await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${resendApiKey}`,

          'Content-Type':
            'application/json',

          'User-Agent':
            'huddle-presenca/1.0',
        },

        body: JSON.stringify(
          {
            from:
              resendFromEmail,

            to: [
              destinatario,
            ],

            subject:
              'Sua senha do Huddle foi alterada',

            text:
              `Olá, ${nome}. Sua senha de acesso ao Huddle foi alterada em ${alteradoEm}. Se você não reconhece esta alteração, entre em contato imediatamente com o administrador do sistema.`,

            html:
              `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:600px;margin:auto"><h2 style="color:#0f766e">Senha alterada</h2><p>Olá, <strong>${nomeSeguro}</strong>.</p><p>Sua senha de acesso ao Huddle foi alterada em <strong>${alteradoEm}</strong>.</p><p>Se você não reconhece esta alteração, entre em contato imediatamente com o administrador do sistema.</p><p style="font-size:13px;color:#64748b">Por segurança, sua senha nunca é enviada por e-mail.</p></div>`,
          }
        ),
      }
    )


  if (!response.ok) {

    const detalhe =
      await response.text()


    throw new Error(
      `Resend respondeu com status ${response.status}: ${detalhe}`
    )

  }

}


Deno.serve(
  async (request: Request) => {

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
      // NOTIFICAR ALTERACAO DE SENHA PELO RESEND
      // A senha nunca e incluida no e-mail.
      // ======================================================

      let notificationSent:
        boolean | null = null


      let notificationWarning:
        string | null = null


      if (password) {

        const destinatario =
          updatedUserData.user.email


        if (!destinatario) {

          notificationSent =
            false


          notificationWarning =
            'A senha foi alterada, mas o usuário não possui um e-mail para receber a notificação.'

        } else {

          try {

            const nomeUsuario =
              String(
                updatedUserData.user
                  .user_metadata
                  ?.nome
                ??
                targetUser
                  .user_metadata
                  ?.nome
                ??
                'usuário'
              )


            await enviarAvisoAlteracaoSenha(
              destinatario,
              nomeUsuario
            )


            notificationSent =
              true

          } catch (notificationError) {

            console.error(
              'Erro ao enviar aviso de alteração de senha:',
              notificationError
            )


            notificationSent =
              false


            notificationWarning =
              'A senha foi alterada, mas não foi possível enviar a notificação por e-mail.'

          }

        }

      }


      // ======================================================
      // RESPOSTA
      // ======================================================

      return respostaJson(
        {
          success: true,

          message:
            'Credenciais atualizadas com sucesso.',

          notification_sent:
            notificationSent,

          notification_warning:
            notificationWarning,

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
