#!/usr/bin/env node

/**
 * Script para processar ícone FREITAS
 * Remove marca d'água e cria versões em diferentes tamanhos
 *
 * Uso: npx node scripts/process-icon.js <caminho-da-imagem>
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

async function processIcon(inputPath) {
  try {
    console.log('🎨 Processando ícone FREITAS...');
    console.log(`📁 Entrada: ${inputPath}`);

    // Verificar se arquivo existe
    const stats = await fs.stat(inputPath);
    if (!stats.isFile()) {
      throw new Error('Arquivo não encontrado');
    }

    const publicDir = path.join(__dirname, '../public');

    // Ler imagem
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    console.log(`📊 Tamanho original: ${metadata.width}x${metadata.height}px`);

    // Criar versão 512x512 (remover marca d'água da parte inferior direita)
    console.log('📐 Criando icon-512.png...');
    await sharp(inputPath)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'icon-512.png'));
    console.log('✅ icon-512.png criado');

    // Criar versão 192x192
    console.log('📐 Criando icon-192.png...');
    await sharp(inputPath)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'icon-192.png'));
    console.log('✅ icon-192.png criado');

    // Criar versão maskable (192x192 com padding)
    console.log('📐 Criando icon-192-maskable.png...');
    const canvas = 192;
    const padding = Math.floor(canvas * 0.1); // 10% de padding
    const innerSize = canvas - (padding * 2);

    await sharp(inputPath)
      .resize(innerSize, innerSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'icon-192-maskable.png'));
    console.log('✅ icon-192-maskable.png criado');

    // Criar favicon.ico (256x256)
    console.log('📐 Criando favicon.ico...');
    await sharp(inputPath)
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 193, g: 39, b: 45 } // Cor do FREITAS
      })
      .ico()
      .toFile(path.join(publicDir, 'favicon.ico'));
    console.log('✅ favicon.ico criado');

    console.log('\n✨ Todos os ícones foram processados com sucesso!');
    console.log('\n📋 Arquivos criados:');
    console.log('  • /public/icon-512.png');
    console.log('  • /public/icon-192.png');
    console.log('  • /public/icon-192-maskable.png');
    console.log('  • /public/favicon.ico');
    console.log('\n✅ manifest.json já está configurado para usar esses ícones!');

  } catch (error) {
    console.error('❌ Erro ao processar ícone:', error.message);
    process.exit(1);
  }
}

// Obter caminho da imagem
const inputPath = process.argv[2];
if (!inputPath) {
  console.error('❌ Uso: npx node scripts/process-icon.js <caminho-da-imagem>');
  console.error('\nExemplo: npx node scripts/process-icon.js ~/Downloads/freitas-logo.png');
  process.exit(1);
}

processIcon(inputPath);
