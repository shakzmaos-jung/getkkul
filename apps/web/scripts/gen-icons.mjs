import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

// 겟꿀 PWA 아이콘 생성(꿀색 배경 + 흰 꿀방울). sharp(resvg)로 SVG→PNG.
mkdirSync('public/icons', { recursive: true });

const GRAD =
  '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" stop-color="#FBBF24"/><stop offset="1" stop-color="#F59E0B"/>' +
  '</linearGradient></defs>';

// 꿀방울(teardrop): 위 뾰족, 아래 둥근 반원.
function drop(cx, tipY, r) {
  const by = tipY + r * 2.4;
  const leftX = cx - r,
    rightX = cx + r;
  return (
    `M ${cx} ${tipY} ` +
    `C ${cx - r * 0.9} ${tipY + r * 1.3}, ${leftX} ${by - r * 0.8}, ${leftX} ${by} ` +
    `a ${r} ${r} 0 1 0 ${r * 2} 0 ` +
    `C ${rightX} ${by - r * 0.8}, ${cx + r * 0.9} ${tipY + r * 1.3}, ${cx} ${tipY} Z`
  );
}

const anySvg =
  '<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">' +
  GRAD +
  '<rect width="512" height="512" rx="112" fill="url(#g)"/>' +
  `<path d="${drop(256, 120, 96)}" fill="#FFFDF5"/>` +
  '<ellipse cx="224" cy="330" rx="30" ry="42" fill="#ffffff" opacity="0.35"/>' +
  '</svg>';

// maskable: 전면 배경 + 세이프존(중앙) 안에 방울 축소.
const maskSvg =
  '<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">' +
  GRAD +
  '<rect width="512" height="512" fill="url(#g)"/>' +
  `<path d="${drop(256, 168, 72)}" fill="#FFFDF5"/>` +
  '<ellipse cx="238" cy="336" rx="23" ry="32" fill="#ffffff" opacity="0.35"/>' +
  '</svg>';

const any = Buffer.from(anySvg);
const mask = Buffer.from(maskSvg);

await sharp(any).resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp(any).resize(512, 512).png().toFile('public/icons/icon-512.png');
await sharp(any).resize(180, 180).png().toFile('public/icons/apple-touch-icon.png');
await sharp(mask).resize(512, 512).png().toFile('public/icons/icon-maskable-512.png');
console.log('icons generated: 192, 512, maskable-512, apple-touch(180)');
