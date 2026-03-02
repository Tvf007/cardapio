#!/usr/bin/env node

/**
 * Script para gerar ícones PWA do FREITAS
 * Gera versões em diferentes tamanhos com as cores oficiais
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

const FREITAS_RED = '#C1272D';
const WHITE = '#FFFFFF';

async function generateIcons() {
  try {
    console.log('🎨 Gerando ícones PWA do FREITAS...');

    const publicDir = path.join(__dirname, '../public');

    // SVG com o padrão do FREITAS (F + trigo)
    const svg = `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <rect width="512" height="512" fill="${FREITAS_RED}"/>
        <text x="256" y="280" font-size="200" font-weight="bold" fill="${WHITE}" text-anchor="middle" font-family="Arial, sans-serif">F</text>
        <text x="256" y="380" font-size="80" font-weight="bold" fill="${WHITE}" text-anchor="middle" font-family="Arial, sans-serif">FREITAS</text>
      </svg>
    `.trim();

    // Criar arquivo SVG temporário
    const svgPath = path.join(publicDir, 'temp-icon.svg');
    await fs.writeFile(svgPath, svg);

    console.log('📐 Criando icon-512.png...');
    await sharp(Buffer.from(svg))
      .resize(512, 512)
      .png()
      .toFile(path.join(publicDir, 'icon-512.png'));
    console.log('✅ icon-512.png criado');

    console.log('📐 Criando icon-192.png...');
    await sharp(Buffer.from(svg))
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192.png'));
    console.log('✅ icon-192.png criado');

    console.log('📐 Criando icon-192-maskable.png...');
    // Versão maskable com padding
    const maskableSvg = `
      <svg width="192" height="192" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
        <rect width="192" height="192" fill="${FREITAS_RED}"/>
        <text x="96" y="110" font-size="80" font-weight="bold" fill="${WHITE}" text-anchor="middle" font-family="Arial, sans-serif">F</text>
      </svg>
    `.trim();

    await sharp(Buffer.from(maskableSvg))
      .resize(192, 192)
      .png()
      .toFile(path.join(publicDir, 'icon-192-maskable.png'));
    console.log('✅ icon-192-maskable.png criado');

    console.log('📐 Criando favicon.png...');
    const faviconSvg = `
      <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <rect width="256" height="256" fill="${FREITAS_RED}"/>
        <text x="128" y="160" font-size="120" font-weight="bold" fill="${WHITE}" text-anchor="middle" font-family="Arial, sans-serif">F</text>
      </svg>
    `.trim();

    await sharp(Buffer.from(faviconSvg))
      .resize(256, 256)
      .png()
      .toFile(path.join(publicDir, 'favicon.png'));
    console.log('✅ favicon.png criado');

    // Limpar arquivo temporário
    try {
      await fs.unlink(svgPath);
    } catch (e) {
      // ignore
    }

    console.log('\n✨ Todos os ícones foram gerados com sucesso!');
    console.log('\n📋 Arquivos criados:');
    console.log('  • /public/icon-512.png (512x512)');
    console.log('  • /public/icon-192.png (192x192)');
    console.log('  • /public/icon-192-maskable.png (192x192 maskable)');
    console.log('  • /public/favicon.ico (256x256)');
    console.log('\n✅ manifest.json já está configurado!');

  } catch (error) {
    console.error('❌ Erro ao gerar ícones:', error.message);
    process.exit(1);
  }
}

generateIcons();
