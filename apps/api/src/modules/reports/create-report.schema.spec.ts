import { describe, expect, it } from 'vitest';
import {
  createReportSchema,
  ReportReason,
  ReportTargetType,
} from '@xidmetal/shared';

describe('createReportSchema', () => {
  it('OTHER üçün targetId olmadan keçir', () => {
    const parsed = createReportSchema.safeParse({
      targetType: ReportTargetType.OTHER,
      reason: ReportReason.SPAM,
      description: 'Bu spam hesabdır və təkrar mesaj göndərir.',
    });
    expect(parsed.success).toBe(true);
  });

  it('qısa təsviri rədd edir', () => {
    const parsed = createReportSchema.safeParse({
      targetType: ReportTargetType.OTHER,
      reason: ReportReason.OTHER,
      description: 'qısa',
    });
    expect(parsed.success).toBe(false);
  });

  it('BOOKING üçün UUID qəbul edir', () => {
    const parsed = createReportSchema.safeParse({
      targetType: ReportTargetType.BOOKING,
      targetId: '550e8400-e29b-41d4-a716-446655440000',
      reason: ReportReason.NO_SHOW,
      description: 'Xidmət verən razılaşdırılmış vaxtda gəlmədi.',
    });
    expect(parsed.success).toBe(true);
  });
});
