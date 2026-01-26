# 🍽️ Cardápio Caixa Freitas - Guia de Desenvolvimento

## Descrição do Projeto

Um cardápio digital moderno e responsivo criado com **Next.js 16**, **React 19**, **TypeScript** e **Tailwind CSS 4**.

## Estrutura do Projeto

```
cardapio-caixa-freitas/
├── app/
│   ├── layout.tsx          # Layout raiz da aplicação
│   ├── page.tsx            # Página inicial com o cardápio
│   ├── globals.css         # Estilos globais com Tailwind
│   └── favicon.ico         # Ícone da aplicação
├── components/
│   ├── MenuItem.tsx        # Componente de item do menu
│   ├── CategoryFilter.tsx  # Componente de filtro de categorias
│   ├── MenuGrid.tsx        # Componente de grid do menu
│   └── index.ts            # Exportações de componentes
├── types/
│   └── index.ts            # Definições de tipos TypeScript
├── data/
│   └── menu.ts             # Dados mock do cardápio
├── .vscode/
│   └── settings.json       # Configurações do VSCode
├── package.json            # Dependências do projeto
├── tsconfig.json           # Configurações do TypeScript
├── next.config.ts          # Configurações do Next.js
└── postcss.config.mjs      # Configurações do Tailwind CSS
```

## Funcionalidades Implementadas

### ✅ Página Inicial
- Header com título do cardápio
- Filtro por categorias
- Grade responsiva de itens
- Footer com informações

### ✅ Componentes
- **MenuItem**: Card individual de item com descrição, preço e status de disponibilidade
- **CategoryFilter**: Filtro interativo de categorias com botão "Todos"
- **MenuGrid**: Grid responsivo que adapta para 1, 2 ou 3 colunas

### ✅ Dados
- 5 categorias: Entradas, Pratos Principais, Acompanhamentos, Bebidas e Sobremesas
- 17 itens de exemplo com preços, descrições e status de disponibilidade

### ✅ Design
- Layout responsivo (mobile, tablet, desktop)
- Cores profissionais e contraste adequado
- Efeitos de hover nos botões e cards
- Footer com informações

## Como Executar

### 1. Instalar Dependências
```bash
npm install
```

### 2. Rodar em Desenvolvimento
```bash
npm run dev
```

A aplicação estará disponível em: **http://localhost:3000**

### 3. Build para Produção
```bash
npm run build
npm start
```

### 4. Linter
```bash
npm run lint
```

## Próximas Implementações Sugeridas

- [ ] Adicionar carrinho de compras com Context API ou Zustand
- [ ] Página de checkout para finalizar pedidos
- [ ] Integração com backend para salvar pedidos
- [ ] Sistema de autenticação
- [ ] Imagens reais dos pratos
- [ ] Busca por nome de item
- [ ] Sistema de favoritos
- [ ] Filtro por preço
- [ ] Avaliações e comentários
- [ ] Notificações em tempo real de pedidos

## Tecnologias Utilizadas

| Tecnologia | Versão | Função |
|-----------|--------|--------|
| Next.js | 16.1.4 | Framework React com SSR |
| React | 19.2.3 | Biblioteca UI |
| TypeScript | 5 | Tipagem estática |
| Tailwind CSS | 4 | Estilização |
| ESLint | 9 | Linting |

## Configurações do VSCode

As seguintes configurações foram ativadas em `.vscode/settings.json`:
- `claudeCode.autoApprove.bash`: Aprova comandos bash automaticamente
- `claudeCode.autoApprove.edits`: Aprova edições de arquivo automaticamente
- Formatação automática ao salvar com Prettier
- Fix automático com ESLint

## Notas de Desenvolvimento

- A página usa `"use client"` para habilitar React Hooks no App Router
- Os componentes são reutilizáveis e seguem as melhores práticas React
- As cores seguem um esquema profissional com azul como cor primária
- O layout é totalmente responsivo usando classes Tailwind
