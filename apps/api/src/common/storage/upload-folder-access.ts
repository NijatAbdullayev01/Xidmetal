import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@xidmetal/shared';
import { UPLOAD_FOLDERS, type UploadFolder } from './storage.types';

/** KYC və xidmət şəkilləri yalnız xidmət verən (və admin) */
const PROVIDER_ONLY_FOLDERS: ReadonlySet<UploadFolder> = new Set([
  UPLOAD_FOLDERS.KYC,
  UPLOAD_FOLDERS.SERVICES,
]);

export function assertUploadFolderAccess(folder: UploadFolder, role: string): void {
  if (role === UserRole.ADMIN) return;
  if (PROVIDER_ONLY_FOLDERS.has(folder) && role !== UserRole.PROVIDER) {
    throw new ForbiddenException('Bu qovluğa şəkil yükləmək icazəniz yoxdur');
  }
}
