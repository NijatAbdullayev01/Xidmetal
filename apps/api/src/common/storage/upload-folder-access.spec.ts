import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { UserRole } from '@xidmetal/shared';
import { assertUploadFolderAccess } from './upload-folder-access';
import { UPLOAD_FOLDERS } from './storage.types';

describe('assertUploadFolderAccess', () => {
  it('xidmət alana KYC və services qadağandır', () => {
    expect(() =>
      assertUploadFolderAccess(UPLOAD_FOLDERS.KYC, UserRole.CUSTOMER),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertUploadFolderAccess(UPLOAD_FOLDERS.SERVICES, UserRole.CUSTOMER),
    ).toThrow(ForbiddenException);
  });

  it('xidmət verən KYC/services yükləyə bilər', () => {
    expect(() =>
      assertUploadFolderAccess(UPLOAD_FOLDERS.KYC, UserRole.PROVIDER),
    ).not.toThrow();
    expect(() =>
      assertUploadFolderAccess(UPLOAD_FOLDERS.SERVICES, UserRole.PROVIDER),
    ).not.toThrow();
  });

  it('xidmət alan avatars/bookings/messages yükləyə bilər', () => {
    expect(() =>
      assertUploadFolderAccess(UPLOAD_FOLDERS.AVATARS, UserRole.CUSTOMER),
    ).not.toThrow();
    expect(() =>
      assertUploadFolderAccess(UPLOAD_FOLDERS.BOOKINGS, UserRole.CUSTOMER),
    ).not.toThrow();
    expect(() =>
      assertUploadFolderAccess(UPLOAD_FOLDERS.MESSAGES, UserRole.CUSTOMER),
    ).not.toThrow();
  });

  it('admin bütün qovluqlara icazəlidir', () => {
    expect(() =>
      assertUploadFolderAccess(UPLOAD_FOLDERS.KYC, UserRole.ADMIN),
    ).not.toThrow();
  });
});
