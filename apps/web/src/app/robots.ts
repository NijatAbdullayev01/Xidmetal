import type { MetadataRoute } from 'next';
import { isPublicComingSoonEnabled } from '@/lib/coming-soon';
import { buildRobotsConfig } from '@/lib/robots-config';
import { getSiteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  return buildRobotsConfig(getSiteUrl(), isPublicComingSoonEnabled());
}
