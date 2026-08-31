import { ImageResponse } from 'next/og';

export const alt = 'Xidmətal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          backgroundColor: '#FFCC00',
          color: '#1A1A1A',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: '-0.04em' }}>
          Xidmətal
        </div>
        <div
          style={{
            marginTop: 24,
            maxWidth: 820,
            fontSize: 32,
            lineHeight: 1.35,
            opacity: 0.88,
          }}
        >
          Xidmət verənlərlə xidmət alanları bir araya gətirən platforma
        </div>
      </div>
    ),
    { ...size },
  );
}
