import { ServiceStatus } from './enums';

/** Qaralama həmişə; düzəliş tələbində yalnız məzmun dəyişəndən sonra */
export function canSubmitServiceForReview(input: {
  status: ServiceStatus;
  hasRevisionEdits: boolean;
}): boolean {
  if (input.status === ServiceStatus.DRAFT) return true;
  if (input.status === ServiceStatus.NEEDS_REVISION) return input.hasRevisionEdits;
  return false;
}
