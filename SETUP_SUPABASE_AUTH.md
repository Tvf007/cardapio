# Setup Supabase Auth e Deploy na Vercel

## 📋 Resumo das Mudanças

Implementei sincronização em tempo real com Supabase e autenticação segura. O aplicativo agora:

✅ **Sincronização em Tempo Real**: Múltiplos dispositivos e abas veem mudanças instantaneamente
✅ **Autenticação Segura**: Admin faz login com email/senha via Supabase Auth
✅ **Validação de Dados**: Zod valida todos os dados antes de salvar
✅ **Retry Automático**: Falhas de rede são recuperadas automaticamente
✅ **Notificações**: Toast notifications em vez de alertas
✅ **Estado Global**: Context API para comunicação entre componentes

---

## 🚀 Passo 1: Criar Usuário Admin no Supabase

### 1.1 Acessar Supabase Console
- Vá para [supabase.com](https://supabase.com)
- Faça login com sua conta
- Selecione o projeto `xwyzkadsdifoztekwqfd`

### 1.2 Acessar Authentication
- No menu esquerdo, clique em **Authentication**
- Clique na aba **Users**
- Clique no botão **Add User** (ou "Invite User")

### 1.3 Criar Novo Usuário
Preencha os campos:
- **Email**: `seu@email.com` (use o email que quer usar para admin)
- **Password**: Crie uma senha forte (ex: `MinhaSenha123!@#`)
- Marque **Auto Confirm User** (se aparecer)
- Clique **Save**

### 1.4 Verificar Usuário Criado
O usuário deve aparecer na lista de users com status "Not confirmed" ou "Confirmed".

---

## 🔐 Passo 2: Configurar Autenticação

### 2.1 Habilitar Email Auth no Supabase
- No menu **Authentication** → **Providers**
- Procure por **Email**
- Verifique se está habilitado (checkbox ativado)

### 2.2 Testar Login Localmente (Opcional)
Se quiser testar antes de fazer deploy:

```bash
# Na pasta do projeto
npm run dev

# Acesse http://localhost:3000/admin
# Use o email e senha que criou acima
```

---

## 📱 Passo 3: Configurar Deploy na Vercel

### 3.1 Conectar ao Vercel
1. Vá para [vercel.com](https://vercel.com)
2. Faça login (use sua conta GitHub se conectou lá)
3. Clique em **Add New...** → **Project**
4. Selecione o repositório `cardapio` do GitHub
5. Clique **Import**

### 3.2 Configurar Variáveis de Ambiente
Na página de configuração do Vercel:

**Adicione as variáveis:**
```
NEXT_PUBLIC_SUPABASE_URL: https://xwyzkadsdifoztekwqfd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY: (copie de .env.local)
```

Estas variáveis já estão no seu `.env.local`, basta copiar.

### 3.3 Deploy
- Clique **Deploy**
- Espere o build terminar (pode levar 2-3 minutos)
- Quando terminar, clique no link do site

---

## ✅ Testar Sincronização em Tempo Real

### Teste 1: Mesmo Dispositivo, Múltiplas Abas
1. Abra o cardápio em uma aba: `/` (página inicial)
2. Abra admin em outra aba: `/admin`
3. Faça login com seu email e senha
4. Adicione um produto novo no admin
5. Volte para a aba do cardápio
6. **Resultado esperado**: Novo produto aparece automaticamente ✅

### Teste 2: Múltiplos Dispositivos
1. No seu computador, abra o cardápio
2. No seu celular, abra o mesmo site (copie o link)
3. No computador, vá para `/admin` e faça login
4. Adicione um novo produto
5. No celular, atualize a página
6. **Resultado esperado**: Novo produto aparece no celular ✅

### Teste 3: Sincronização em Tempo Real (Se estiver na mesma rede)
1. Deixe o cardápio aberto em duas abas
2. Vá para `/admin` em outra aba
3. Faça login e adicione um produto
4. Volte para as abas do cardápio
5. **Resultado esperado**: Ambas as abas veem o novo produto sem recarregar ✅

---

## 🔍 Troubleshooting

### Problema: "Email não confirma"
**Solução**: No Supabase, vá em **Authentication** → **Email Templates** e verifique se o email de confirmação está ativado. Ou marque "Auto Confirm User" ao criar.

### Problema: "Erro ao fazer login"
**Solução**:
1. Verifique se o email e senha estão corretos
2. Acesse Supabase → Authentication → Users e confirme que o usuário existe
3. Se estiver em dev local, verifique se o .env.local está correto

### Problema: "Produtos não sincronizam entre abas"
**Solução**:
1. Verifique se o navegador suporta BroadcastChannel (navegadores modernos suportam)
2. Tente recarregar a página
3. Verifique a conexão com internet

### Problema: "Supabase Realtime não funciona"
**Solução**:
1. Vá ao Supabase Console
2. No projeto, clique em **Settings** → **Realtime**
3. Verifique se Realtime está habilitado
4. Clique em **Manage Replication** e confirme que as tabelas `categories` e `menu_items` estão selecionadas

---

## 📚 Arquivos Importantes

### Novos Arquivos
- `lib/validation.ts` - Schemas Zod para validação
- `lib/api.ts` - Serviço com timeout e retry
- `lib/auth.ts` - Supabase Authentication
- `hooks/useSyncedData.ts` - Hook de sincronização em tempo real
- `contexts/CardapioContext.tsx` - Context global para estado

### Modificados
- `app/layout.tsx` - Adicionado CardapioProvider
- `app/HomeContent.tsx` - Refatorado para usar Context
- `app/admin/page.tsx` - Supabase Auth + Context
- `components/AdminLogin.tsx` - Campo de email adicionado
- `app/api/sync/route.ts` - Validação Zod adicionada

---

## 🎯 Funcionalidades Implementadas

### 1. Sincronização em Tempo Real
- ✅ Supabase Realtime para detectar mudanças
- ✅ BroadcastChannel para sincronizar entre abas
- ✅ Fallback automático para localStorage

### 2. Autenticação Segura
- ✅ Supabase Auth (email/senha)
- ✅ Sem senhas hardcoded
- ✅ Tokens JWT gerenciados automaticamente

### 3. Validação de Dados
- ✅ Zod para validação em tempo de compilação e runtime
- ✅ Mensagens de erro específicas
- ✅ Tipos TypeScript sincronizados com Zod

### 4. Resiliência de Rede
- ✅ Timeout de 5 segundos em requisições
- ✅ Retry automático com backoff exponencial
- ✅ Fallback para localStorage
- ✅ Tratamento robusto de erros

### 5. Melhor UX
- ✅ Toast notifications em vez de alerts
- ✅ Estado de sincronização visível
- ✅ Indicadores de carregamento
- ✅ Mensagens de erro claras

---

## 🚀 Próximos Passos (Opcional)

### 1. Adicionar Mais Admins
Repita o "Passo 1" para criar mais usuários admin. Cada um pode usar um email diferente.

### 2. Customizar Temas
As cores estão definidas em:
- `app/globals.css` - Cores e estilos globais
- `tailwind.config.ts` - Configuração do Tailwind

### 3. Adicionar Rate Limiting
Se quiser proteger as APIs contra abuse:
- Use um middleware no Next.js
- Ou use o serviço de Rate Limiting do Vercel

### 4. Monitorar Erros em Produção
- Configure Sentry ou similar para monitorar erros
- Verifique os logs do Vercel

---

## 📞 Suporte

Se encontrar problemas:

1. **Verifique o console do navegador** (F12 → Console)
2. **Verifique os logs do Vercel** (Vercel Dashboard → Logs)
3. **Teste localmente** com `npm run dev`
4. **Verifique o Supabase** para erros de conexão

---

**Parabéns! 🎉 Seu cardápio digital agora tem sincronização em tempo real e autenticação segura!**
