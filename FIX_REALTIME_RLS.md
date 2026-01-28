# Corrigir Sincronização em Tempo Real - Políticas RLS

O Realtime não está funcionando entre dispositivos porque as **RLS (Row Level Security) policies** não estão configuradas corretamente para a role `anon`.

## O Problema

Você ativou a replicação nas tabelas (`categories` e `menu_items`), mas sem as RLS policies corretas, a role `anon` (que seu site usa) **não consegue ESCUTAR** as mudanças via WebSocket.

Você está vendo sincronização no mesmo dispositivo porque:
- **BroadcastChannel** sincroniza entre abas do mesmo navegador ✅
- **Realtime** (WebSocket) sincroniza entre dispositivos ❌ (porque RLS bloqueia)

## Solução: Configurar RLS Policies

### Passo 1: Ir para Database > Policies no Supabase

1. Acesse: https://supabase.com/dashboard
2. Vá para seu projeto **cardapio**
3. Clique em **Database** (esquerda)
4. Clique em **Policies**
5. Você deve ver as tabelas listadas

### Passo 2: Habilitar RLS na tabela `categories`

1. Na lista de Policies, procure pela tabela **categories**
2. Clique em **Enable RLS** (se ainda não está habilitado)
3. Você verá uma mensagem dizendo "RLS is enabled but no policies defined"

### Passo 3: Criar Policy de LEITURA para `categories`

1. Clique no botão **New Policy** ou **Create Policy**
2. **Nome da Policy**: `Enable read access for anon`
3. **Command**: SELECT
4. **Role**: anon
5. **Using expression**: Deixe em branco ou coloque `true` (permite ler tudo)
6. Clique **Review** e depois **Save**

Resultado: A role `anon` pode LER dados de `categories` ✅

### Passo 4: Criar Policy para sincronização com Realtime

1. Clique novamente em **New Policy**
2. **Nome da Policy**: `Enable realtime for all`
3. **Command**: SELECT (o Realtime usa SELECT para escutar)
4. **Role**: anon
5. **Using expression**: deixe vazio ou `true`
6. **Force**: deixe OFF
7. Clique **Review** e depois **Save**

### Passo 5: Repetir para tabela `menu_items`

Faça exatamente o mesmo processo para a tabela **menu_items**:
1. Clique em **menu_items** na lista de tabelas
2. Clique **Enable RLS**
3. Crie a Policy: `Enable read access for anon` (SELECT, anon, `true`)
4. Crie a Policy: `Enable realtime for all` (SELECT, anon, `true`)

## Resumo das Policies Necessárias

Para CADA tabela (`categories` e `menu_items`), você precisa de:

| Policy | Command | Role | Expression | Resultado |
|--------|---------|------|------------|-----------|
| Enable read access for anon | SELECT | anon | true | Pode ler |
| Enable realtime for all | SELECT | anon | true | Pode escutar mudanças |

## Depois de Criar as Policies

Após criar as policies:

1. **Redeploye no Vercel** (se não fez depois de ativar replicação):
   - Vá para https://vercel.com/dashboard
   - Clique em seu projeto
   - Vá para Deployments
   - Clique o deploy atual e selecione **Redeploy**

2. **Teste novamente**:
   - Abra em 2 dispositivos/abas diferentes
   - Crie uma categoria no admin
   - Deve aparecer **instantaneamente** no cardápio (em menos de 1 segundo)

## Se Ainda Não Funcionar

Abra o **Console do Navegador** (F12) e procure por:

**Sucesso:**
```
[cardapio-realtime] Subscribed to postgres_changes
```

**Erro:**
```
[cardapio-realtime] Channel error: Permission denied
```

Se vir "Permission denied", significa que:
- As RLS policies não estão corretas
- Volte e verifique se criou as policies para AMBAS as tabelas
- Certifique-se de que selecionou role `anon`

## Alternativa: Desabilitar RLS (menos seguro)

Se tiver dificuldade em configurar RLS, pode desabilitar temporariamente:

1. Na aba **Policies**, clique em cada tabela
2. Clique **Disable RLS**
3. Isso permitirá acesso público total (não recomendado para produção)

Mas recomendo configurar as policies corretamente como descrito acima.
