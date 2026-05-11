#!/usr/bin/env node
'use strict';
const sharp = require('sharp');
const path  = require('path');

const W = 1200, H = 630;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#1a1a2e"/>
      <stop offset="100%" stop-color="#0f3460"/>
    </linearGradient>
    <linearGradient id="titleGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#4A90D9"/>
      <stop offset="100%" stop-color="#F5A623"/>
    </linearGradient>
    <linearGradient id="cardGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#16213e" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#0f2044" stop-opacity="0.95"/>
    </linearGradient>
    <!-- grid cell gradients -->
    <linearGradient id="shirtFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#4A90D9" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#4A90D9" stop-opacity="0.25"/>
    </linearGradient>
    <linearGradient id="beerFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#F5A623" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#F5A623" stop-opacity="0.25"/>
    </linearGradient>
  </defs>

  <!-- 背景 -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- 装飾: 左上・右下のぼかした円 -->
  <circle cx="80"  cy="80"  r="200" fill="#4A90D9" fill-opacity="0.06"/>
  <circle cx="${W-80}" cy="${H-80}" r="200" fill="#F5A623" fill-opacity="0.06"/>

  <!-- メインカード -->
  <rect x="60" y="50" width="${W-120}" height="${H-100}" rx="24"
        fill="url(#cardGrad)" stroke="#2a2a4a" stroke-width="1.5"/>

  <!-- 左側: テキストエリア -->
  <!-- タグライン -->
  <text x="100" y="145" font-family="Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif"
        font-size="22" fill="#a0a0b0" letter-spacing="2">毎日1問の論理パズル</text>

  <!-- メインタイトル -->
  <text x="100" y="240" font-family="Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif"
        font-size="80" font-weight="700" fill="url(#titleGrad)" letter-spacing="4">定時退社タンゴ</text>

  <!-- サブタイトル: 色ドットでシンボルを表現 -->
  <rect x="100" y="282" width="22" height="22" rx="5" fill="#4A90D9"/>
  <rect x="132" y="282" width="22" height="22" rx="5" fill="#F5A623"/>
  <text x="166" y="300" font-family="Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif"
        font-size="26" fill="#e8e8e8" fill-opacity="0.85">を並べてバランスよく退社しよう！</text>

  <!-- ルール説明 -->
  <rect x="100" y="330" width="580" height="2" rx="1" fill="#2a2a4a"/>

  <!-- ルール1 -->
  <rect x="100" y="360" width="14" height="14" rx="3" fill="#4A90D9"/>
  <rect x="120" y="360" width="14" height="14" rx="3" fill="#F5A623"/>
  <text x="144" y="373" font-family="Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif"
        font-size="22" fill="#a0a0b0">各行・各列にちょうど3個ずつ</text>

  <!-- ルール2 -->
  <rect x="100" y="408" width="14" height="14" rx="3" fill="#4A90D9"/>
  <rect x="120" y="408" width="14" height="14" rx="3" fill="#4A90D9"/>
  <rect x="140" y="408" width="14" height="14" rx="3" fill="#F5A623"/>
  <text x="166" y="421" font-family="Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif"
        font-size="22" fill="#a0a0b0">同じ色を3つ以上連続してはいけない</text>

  <!-- ルール3 -->
  <rect x="100" y="456" width="14" height="14" rx="3" fill="#4A90D9" stroke="#4A90D9" stroke-width="1"/>
  <text x="108" y="467" font-family="Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif"
        font-size="11" fill="#1a1a2e" text-anchor="middle" font-weight="700">=</text>
  <text x="130" y="469" font-family="Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif"
        font-size="22" fill="#a0a0b0">制約マーカー（＝・×）のルールに従う</text>

  <!-- URLバッジ -->
  <rect x="100" y="545" width="260" height="38" rx="19"
        fill="#4A90D9" fill-opacity="0.18" stroke="#4A90D9" stroke-opacity="0.5" stroke-width="1"/>
  <text x="230" y="569" font-family="Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif"
        font-size="19" fill="#4A90D9" text-anchor="middle" letter-spacing="0.5">teiji-tango.com</text>

  <!-- 右側: ミニグリッド -->
  <!-- グリッド背景 -->
  <rect x="730" y="100" width="390" height="430" rx="20"
        fill="#16213e" stroke="#2a2a4a" stroke-width="1.5"/>

  <!-- グリッドセル (6×6) -->
  ${(()=>{
    const data = [
      [1,2,1,2,1,2],
      [2,1,2,1,2,1],
      [1,2,2,1,1,2],
      [2,1,1,2,2,1],
      [2,1,2,1,1,2],
      [1,2,1,2,2,1],
    ];
    const emojis = { 1:'👔', 2:'🍺' };
    const CELL = 56, GAP = 6;
    const GOFFX = 750, GOFFY = 118;
    let cells = '';
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        const x = GOFFX + c * (CELL + GAP);
        const y = GOFFY + r * (CELL + GAP);
        const v = data[r][c];
        const fill = v === 1 ? 'url(#shirtFill)' : 'url(#beerFill)';
        const stroke = v === 1 ? '#4A90D9' : '#F5A623';
        const dotColor = v === 1 ? '#4A90D9' : '#F5A623';
        cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="8"
                        fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
        // 中央に小さな丸でシンボルを表現
        cells += `<circle cx="${x + CELL/2}" cy="${y + CELL/2}" r="10" fill="${dotColor}" fill-opacity="0.8"/>`;
      }
    }
    return cells;
  })()}

  <!-- グリッドラベル -->
  <text x="925" y="532" font-family="Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif"
        font-size="17" fill="#a0a0b0" text-anchor="middle">クリア後はこのグリッドをシェア！</text>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .toFile(path.join(__dirname, '..', 'icons', 'ogp.png'))
  .then(info => console.log('OGP生成完了:', info.width + 'x' + info.height))
  .catch(err => { console.error(err); process.exit(1); });
