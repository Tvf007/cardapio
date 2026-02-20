/**
 * OpenAPI 3.0 Specification para Cardápio API
 * Gerado automaticamente com swagger-jsdoc
 */

export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Cardápio Padaria Freitas API",
    description:
      "API para gerenciamento de cardápio digital com sincronização em tempo real",
    version: "1.0.0",
    contact: {
      name: "Padaria Freitas",
      url: "https://cardapio-freitas.netlify.app",
    },
  },
  servers: [
    {
      url: "https://cardapio-freitas.netlify.app",
      description: "Production",
    },
    {
      url: "http://localhost:3000",
      description: "Development",
    },
  ],
  paths: {
    "/api/sync": {
      get: {
        tags: ["Menu"],
        summary: "Buscar cardápio completo",
        description: "Retorna todas as categorias e produtos do cardápio",
        responses: {
          "200": {
            description: "Sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    categories: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          order: { type: "number" },
                        },
                      },
                    },
                    products: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          description: { type: "string" },
                          price: { type: "number" },
                          category: { type: "string" },
                          image: { type: "string" },
                          available: { type: "boolean" },
                          order: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "500": {
            description: "Erro ao buscar dados",
          },
        },
      },
      post: {
        tags: ["Menu"],
        summary: "Sincronizar cardápio (admin)",
        description: "Atualiza categorias e produtos. Requer autenticação admin.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  categories: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        order: { type: "number" },
                      },
                    },
                  },
                  products: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        price: { type: "number" },
                        category: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Sincronização bem-sucedida",
          },
          "401": {
            description: "Não autorizado",
          },
          "400": {
            description: "Dados inválidos",
          },
          "500": {
            description: "Erro no servidor",
          },
        },
      },
    },
    "/api/logo": {
      get: {
        tags: ["Logo"],
        summary: "Buscar logo do site",
        description: "Retorna a logo salva em base64 ou null se não existe",
        responses: {
          "200": {
            description: "Sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    logo: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Logo"],
        summary: "Salvar logo (admin)",
        description: "Salva ou deleta a logo do site. Requer autenticação admin.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  logo: {
                    type: "string",
                    nullable: true,
                    description: "Base64 da imagem ou null para deletar",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Logo salva com sucesso",
          },
          "401": {
            description: "Não autorizado",
          },
          "500": {
            description: "Erro ao salvar logo",
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Fazer login",
        description: "Autentica com senha de admin e retorna JWT token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  password: { type: "string" },
                },
                required: ["password"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login bem-sucedido",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "401": {
            description: "Senha incorreta",
          },
          "429": {
            description: "Rate limit excedido (5 req/min)",
          },
        },
      },
    },
    "/api/site-config": {
      get: {
        tags: ["Config"],
        summary: "Buscar configuração do site",
        description: "Retorna uma configuração específica (horários, etc)",
        parameters: [
          {
            name: "key",
            in: "query",
            required: true,
            schema: { type: "string" },
            example: "horarios",
          },
        ],
        responses: {
          "200": {
            description: "Sucesso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    key: { type: "string" },
                    value: { type: "object", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Config"],
        summary: "Salvar configuração (admin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  key: { type: "string" },
                  value: { type: "object" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Configuração salva",
          },
          "401": {
            description: "Não autorizado",
          },
        },
      },
    },
    "/api/upload": {
      post: {
        tags: ["Upload"],
        summary: "Upload de imagem (admin)",
        description: "Faz upload de imagem para Supabase Storage",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description: "Arquivo de imagem (WebP, JPEG, PNG)",
                  },
                  folder: {
                    type: "string",
                    default: "products",
                    description: "Pasta para armazenar",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Upload bem-sucedido",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    url: { type: "string" },
                    fileName: { type: "string" },
                    sizeKB: { type: "number" },
                  },
                },
              },
            },
          },
          "401": {
            description: "Não autorizado",
          },
          "400": {
            description: "Arquivo inválido",
          },
          "429": {
            description: "Rate limit (5 req/min)",
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token do login",
      },
    },
  },
  tags: [
    {
      name: "Menu",
      description: "Operações de cardápio",
    },
    {
      name: "Logo",
      description: "Gerenciamento de logo",
    },
    {
      name: "Auth",
      description: "Autenticação",
    },
    {
      name: "Config",
      description: "Configurações do site",
    },
    {
      name: "Upload",
      description: "Upload de mídia",
    },
  ],
};
