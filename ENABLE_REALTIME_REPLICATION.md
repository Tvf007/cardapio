# Ativar Replicação em Tempo Real (Realtime) no Supabase

Com base nas imagens que você enviou, você já encontrou a seção correta! Aqui está o passo a passo para ativar a replicação para suas tabelas.

## O que você viu nas imagens

Você estava na página: **Publications** (Publicações)
- URL: `supabase.com/dashboard/project/xwyzkadsdifoztekwqfd/database/publications`
- Você viu duas publicações:
  1. `supabase_realtime` (ID 16426) - 0 tabelas ← **ESTA É A QUE VOCÊ PRECISA CONFIGURAR**
  2. `supabase_realtime_messages_publication` (ID 18682) - 1 tabela

- Você também viu a lista de tabelas do banco de dados com toggle switches ao lado delas:
  - `categories` (public) - Switch cinza/desativado
  - `menu_items` (public) - Switch cinza/desativado

## Passo a Passo para Ativar Realtime

### Passo 1: Clicar em `supabase_realtime`
Na página Publications, você precisa clicar na publicação **`supabase_realtime`** (a primeira da lista) para abrir suas configurações.

### Passo 2: Encontrar as Tabelas
Depois de clicar, você verá uma tela mostrando:
- Um campo de busca ou lista de tabelas
- Toggle switches ao lado de cada tabela
- Atualmente devem estar **TODOS DESATIVADOS** (cinza)

### Passo 3: Ativar `categories`
Procure pela tabela **`categories`** na lista e **clique no toggle switch** para ativá-la (o switch deve ficar azul/verde).

### Passo 4: Ativar `menu_items`
Procure pela tabela **`menu_items`** na lista e **clique no toggle switch** para ativá-la (o switch deve ficar azul/verde).

### Passo 5: Salvar as Alterações
Procure por um botão **"Save"** ou **"Update"** (geralmente no topo ou rodapé) e clique para salvar as alterações.

## Depois de Ativar

Após ativar a replicação para essas duas tabelas, siga estes passos:

### 1. Redeployar no Vercel
- Acesse: https://vercel.com/dashboard
- Vá para seu projeto **cardapio-caixa-freitas**
- Clique na aba **"Deployments"**
- Encontre a última deployment (deve estar marcada como "Ready")
- Clique nos três pontos e selecione **"Redeploy"** ou clique direto em **"Redeploy"**
- Aguarde a deployment completar (status muda para "Ready")

### 2. Testar a Sincronização em Tempo Real

Abra seu site em **2 abas do navegador**:

**Aba 1: Página de Cardápio**
- Acesse: https://seu-dominio.vercel.app/

**Aba 2: Painel Admin**
- Acesse: https://seu-dominio.vercel.app/admin
- Faça login com suas credenciais

Na **Aba 2 (Admin)**:
1. Crie uma nova categoria (por exemplo: "Teste Realtime")
2. Clique em "Adicionar"

Na **Aba 1 (Cardápio)**:
- **IMPORTANTE**: Você **NÃO deve atualizar a página**
- A nova categoria deve aparecer **automaticamente** em tempo real, em poucos segundos

Se aparecer em menos de 5 segundos = **Realtime está funcionando!** ✅
Se aparece em ~5 segundos = **Está usando polling fallback (também funciona!)** ✅

## Troubleshooting

**Problema**: Os toggles não aparecem ou estão todos cinzas
- Solução: Verifique se você clicou na publicação **`supabase_realtime`** (não na outra)

**Problema**: Após ativar, o site ainda não sincroniza
- Solução: Verifique se você fez o **Redeploy no Vercel**
- Aguarde 2-3 minutos para o Vercel concluir a deployment
- Limpe o cache do navegador (Ctrl+Shift+Delete) ou use incógnito

**Problema**: Vê erro de WebSocket no console
- Solução: Confirme que você ativou a replicação nas tabelas no Supabase
- Verifique se os toggle switches estão **azuis/verdes**

## Confirmação Visual

Depois de ativar, você deve ver:
- Na página Publications > supabase_realtime:
  - `categories` com toggle **AZUL/VERDE**
  - `menu_items` com toggle **AZUL/VERDE**
  - Número de tabelas mudará de **"0 tables"** para **"2 tables"**

Se vir isso, a replicação está corretamente ativada! 🎉
