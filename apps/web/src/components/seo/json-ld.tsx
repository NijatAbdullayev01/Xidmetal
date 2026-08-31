import type { JsonLd as JsonLdValue } from '@/lib/seo-schema';

function serializeJsonLd(data: JsonLdValue | JsonLdValue[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export function JsonLd({ data }: { data: JsonLdValue | JsonLdValue[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
