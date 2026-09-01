import { API, CLIENT_APP, CLIENT_APP_HEADER, isUuid, servicePublicPath } from '@xidmetal/shared';
import { getServerApiBaseUrl } from './site-url';

const FETCH_TIMEOUT_MS = 5_000;

function timedSignal(): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

export function findCategorySlugById(
  categories: { id: string; slug?: string }[],
  categoryId: string,
): string | null {
  return categories.find((category) => category.id === categoryId)?.slug ?? null;
}

export async function lookupCategorySlugById(categoryId: string): Promise<string | null> {
  const { signal, cancel } = timedSignal();
  try {
    const response = await fetch(`${getServerApiBaseUrl()}${API.prefix}/categories`, {
      signal,
      headers: {
        Accept: 'application/json',
        [CLIENT_APP_HEADER]: CLIENT_APP.MARKETPLACE,
      },
    });
    if (!response.ok) return null;
    const categories = (await response.json()) as { id: string; slug?: string }[];
    if (!Array.isArray(categories)) return null;
    return findCategorySlugById(categories, categoryId);
  } catch {
    return null;
  } finally {
    cancel();
  }
}

export async function lookupServiceCanonicalPath(
  idOrSlug: string,
): Promise<string | null> {
  const { signal, cancel } = timedSignal();
  try {
    const response = await fetch(
      `${getServerApiBaseUrl()}${API.prefix}/services/${encodeURIComponent(idOrSlug)}`,
      {
        signal,
        headers: {
          Accept: 'application/json',
          [CLIENT_APP_HEADER]: CLIENT_APP.MARKETPLACE,
        },
      },
    );
    if (!response.ok) return null;
    const service = (await response.json()) as { id?: string; slug?: string };
    if (!service.id && !service.slug) return null;
    return servicePublicPath({ id: service.id ?? idOrSlug, slug: service.slug });
  } catch {
    return null;
  } finally {
    cancel();
  }
}

export { isUuid };
