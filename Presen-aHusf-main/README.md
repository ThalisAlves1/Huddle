# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Notificação de alteração de senha com Resend

A função `admin-update-auth` envia uma notificação de segurança quando um administrador altera a senha de um usuário. A nova senha não é enviada por e-mail.

Configure estes secrets em **Supabase > Edge Functions > Secrets**:

```env
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=Huddle <acesso@seu-dominio.com>
```

O endereço de envio precisa pertencer a um domínio verificado no Resend. Depois, publique novamente a função:

```bash
supabase functions deploy admin-update-auth
```

## Recuperação de senha

O login possui o fluxo **Esqueci minha senha**, usando o Supabase Auth. Para que os e-mails sejam enviados pelo Resend, configure em **Authentication > Emails > SMTP Settings**:

```text
Host: smtp.resend.com
Port: 465
Username: resend
Password: sua RESEND_API_KEY
Sender email: acesso@seu-dominio-verificado.com
Sender name: Huddle
```

Em **Authentication > URL Configuration**, configure a URL oficial da aplicação como `Site URL` e adicione às `Redirect URLs`:

```text
https://seu-dominio.com/redefinir-senha
http://localhost:5173/redefinir-senha
```

O domínio do remetente deve estar verificado no Resend. A API key deve permanecer somente no Resend/Supabase e nunca ser adicionada às variáveis `VITE_*`.
