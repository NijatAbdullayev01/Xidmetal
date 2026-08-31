import { ImageResponse } from 'next/og';
import { api } from '@/lib/api';

export const alt = 'Xidmətal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

export default async function ServiceOpenGraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let title = 'Xidmətal';
  let subtitle = 'Xidmət verənlərlə xidmət alanları bir araya gətirən platforma';

  try {
    const service = await api.service(id);
    title = service.title;
    subtitle = [service.categoryName, service.location].filter(Boolean).join(' · ') || subtitle;
  } catch {
    // generic fallback
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '72px',
          backgroundColor: '#FFCC00',
          color: '#1A1A1A',
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, opacity: 0.7 }}>Xidmətal</div>
        <div
          style={{
            marginTop: 20,
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div style={{ marginTop: 20, fontSize: 28, opacity: 0.85, maxWidth: 900 }}>
          {subtitle}
        </div>
      </div>
    ),
    { ...size },
  );
}
