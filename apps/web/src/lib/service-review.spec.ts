import { describe, expect, it } from 'vitest';
import { ServiceStatus, canSubmitServiceForReview } from '@xidmetal/shared';

describe('canSubmitServiceForReview', () => {
  it('qaralamanı həmişə göndərməyə icazə verir', () => {
    expect(
      canSubmitServiceForReview({ status: ServiceStatus.DRAFT, hasRevisionEdits: false }),
    ).toBe(true);
  });

  it('düzəliş tələbində yalnız məzmun dəyişəndən sonra icazə verir', () => {
    expect(
      canSubmitServiceForReview({
        status: ServiceStatus.NEEDS_REVISION,
        hasRevisionEdits: false,
      }),
    ).toBe(false);
    expect(
      canSubmitServiceForReview({
        status: ServiceStatus.NEEDS_REVISION,
        hasRevisionEdits: true,
      }),
    ).toBe(true);
  });

  it('digər statuslarda göndərməyə icazə vermir', () => {
    expect(
      canSubmitServiceForReview({
        status: ServiceStatus.PENDING_REVIEW,
        hasRevisionEdits: true,
      }),
    ).toBe(false);
  });
});
