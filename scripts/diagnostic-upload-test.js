/**
 * Script de Diagnóstico para Teste de Upload de Imagem
 *
 * Este script:
 * 1. Cria uma imagem pequena em base64 para teste
 * 2. Envia POST request para /api/sync com o produto
 * 3. Captura a resposta e analisa onde falha
 * 4. Mostra logs do servidor simulados
 */

const fs = require('fs');
const path = require('path');

// Cores para output no console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, title, message) {
  const timestamp = new Date().toISOString();
  console.log(
    `${color}[${timestamp}] ${title}${colors.reset} ${message || ''}`
  );
}

// 1. Criar imagem de teste (100x100 PNG mínimo)
function createTestImage() {
  log(colors.cyan, '[TEST]', 'Criando imagem de teste em base64...');

  // Mínimo PNG válido (100x100 pixels transparente)
  // Convertido para base64
  const minimalPng = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, // IHDR chunk size
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x64, // width: 100
    0x00, 0x00, 0x00, 0x64, // height: 100
    0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, etc
    0x00, 0xb9, 0xd3, 0x97, // CRC
    // ... (simplified, actual PNG would be larger)
  ]);

  // Para teste, vamos usar um PNG válido pequeno em base64
  const smallPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  log(colors.green, '[TEST]', 'Imagem de teste criada');
  return smallPngBase64;
}

// 2. Preparar payload com produto e categorias
function createPayload(imageBase64) {
  log(colors.cyan, '[TEST]', 'Preparando payload...');

  const payload = {
    categories: [
      {
        id: 'paes',
        name: 'Pães',
        order: 1
      }
    ],
    products: [
      {
        id: 'test-product-' + Date.now(),
        name: 'Tt',
        price: 5,
        description: 'Vvhvfg',
        categoryId: 'paes',
        available: true,
        image: imageBase64
      }
    ]
  };

  const payloadSize = JSON.stringify(payload).length;
  log(colors.green, '[TEST]', `Payload criado: ${payloadSize} bytes`);

  return payload;
}

// 3. Testar a sincronização via fetch
async function testSync(payload) {
  log(colors.cyan, '[TEST]', 'Iniciando teste de sincronização...');

  try {
    const url = 'http://localhost:3000/api/sync'; // ou URL de produção

    log(colors.yellow, '[FETCH]', `POST ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    log(colors.yellow, '[FETCH]', `Status: ${response.status}`);

    const data = await response.json();

    if (response.ok) {
      log(colors.green, '[SUCCESS]', JSON.stringify(data, null, 2));
    } else {
      log(colors.red, '[ERROR]', JSON.stringify(data, null, 2));
    }

    return { status: response.status, data };

  } catch (error) {
    log(colors.red, '[ERROR]', error.message);
    return { error: error.message };
  }
}

// 4. Verificar estrutura de validação Zod
function checkZodValidation() {
  log(colors.cyan, '[TEST]', 'Verificando estrutura Zod...');

  try {
    const validationFile = path.join(__dirname, '../lib/validation.ts');
    if (fs.existsSync(validationFile)) {
      log(colors.green, '[TEST]', 'Arquivo validation.ts encontrado');

      // Ler para verificar schemas
      const content = fs.readFileSync(validationFile, 'utf8');

      if (content.includes('MenuItemSchema')) {
        log(colors.green, '[ZEPHYR]', 'MenuItemSchema encontrado em validation.ts');
      } else {
        log(colors.red, '[VALIDATION]', 'MenuItemSchema NÃO encontrado');
      }
    }
  } catch (error) {
    log(colors.red, '[ERROR]', 'Erro ao verificar Zod: ' + error.message);
  }
}

// 5. Executar tudo
async function main() {
  log(colors.blue, '[DIAGNOSTIC]', '=== TESTE DE DIAGNÓSTICO DE UPLOAD ===');
  log(colors.blue, '[DIAGNOSTIC]', `Iniciado: ${new Date().toISOString()}`);
  console.log();

  // Step 1: Criar imagem
  const imageBase64 = createTestImage();
  console.log();

  // Step 2: Criar payload
  const payload = createPayload(imageBase64);
  console.log();

  // Step 3: Verificar Zod
  checkZodValidation();
  console.log();

  // Step 4: Testar sincronização
  log(colors.yellow, '[TEST]', 'Aguardando conexão ao servidor...');
  const result = await testSync(payload);
  console.log();

  // Resumo
  log(colors.blue, '[DIAGNOSTIC]', '=== RESUMO ===');
  if (result.error) {
    log(colors.red, '[RESULT]', 'Erro de conexão: ' + result.error);
  } else if (result.status === 200) {
    log(colors.green, '[RESULT]', 'Upload bem-sucedido');
  } else {
    log(colors.red, '[RESULT]', `Erro HTTP ${result.status}`);
    if (result.data?.error) {
      log(colors.red, '[DETAILS]', result.data.error);
    }
  }

  log(colors.blue, '[DIAGNOSTIC]', `Concluído: ${new Date().toISOString()}`);
}

// Executar
main().catch(error => {
  log(colors.red, '[FATAL]', error.message);
  process.exit(1);
});
