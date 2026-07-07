import { ImageResponse } from 'next/og';

/**
 * OG 이미지: 겟꿀 브랜드 배지 + 소개 문구. 링크 공유(카카오톡/문자 등) 미리보기와
 * 공유 시트 아이콘이 겟꿀 브랜드로 보이게 한다. 한글 렌더를 위해 NanumGothic TTF 로드.
 */
export const alt = '겟꿀 — 유튜브 콘텐츠를 꿀같이 압축해 당신의 소중한 시간을 절약해드립니다';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const FONT_URL =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/nanumgothic/NanumGothic-Bold.ttf';

export default async function OpengraphImage() {
  let fonts: { name: string; data: ArrayBuffer; weight: 700; style: 'normal' }[] | undefined;
  try {
    const data = await fetch(FONT_URL).then((r) => r.arrayBuffer());
    fonts = [{ name: 'Nanum', data, weight: 700, style: 'normal' }];
  } catch {
    fonts = undefined; // 폰트 로드 실패 시에도 이미지는 생성(한글은 기본 폰트)
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFFBEB',
          fontFamily: 'Nanum',
          padding: '72px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 200,
            height: 200,
            borderRadius: 48,
            background: '#F59E0B',
            color: '#ffffff',
            fontSize: 92,
            fontWeight: 700,
          }}
        >
          겟꿀
        </div>
        <div
          style={{
            marginTop: 44,
            maxWidth: 960,
            fontSize: 50,
            lineHeight: 1.4,
            color: '#1f2937',
            fontWeight: 700,
          }}
        >
          유튜브 콘텐츠를 꿀같이 압축해 당신의 소중한 시간을 절약해드립니다
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
