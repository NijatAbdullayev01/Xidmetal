import { NotificationType } from '@xidmetal/shared';
import type { PushMessage } from './push.types';

/**
 * In-app bildirişdən push məzmunu (saf).
 */
export function buildPushFromNotification(input: {
  title: string;
  body: string;
  type: NotificationType | string;
  data?: Record<string, unknown> | null;
}): PushMessage {
  const data: Record<string, string> = {
    type: String(input.type),
  };

  if (input.data) {
    for (const [key, value] of Object.entries(input.data)) {
      if (value === undefined || value === null) continue;
      data[key] = typeof value === 'string' ? value : String(value);
    }
  }

  return {
    title: input.title,
    body: input.body,
    data,
  };
}
