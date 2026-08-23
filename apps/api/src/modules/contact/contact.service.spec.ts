import { describe, expect, it, vi } from 'vitest';
import { ContactService } from './contact.service';

const dto = {
  name: 'Əli Məmmədov',
  email: 'ali@example.com',
  phone: '+994501234567',
  subject: 'provider' as const,
  message: 'Xidmət verən dəstəyi üçün test mesajı.',
};

describe('ContactService.submit', () => {
  it('SMTP uğursuz olsa belə inbox-a yazıb uğur qaytarır', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'c1' });
    const sendContactMessage = vi
      .fn()
      .mockRejectedValue(new Error('connect ECONNREFUSED ::1:587'));
    const service = new ContactService(
      { sendContactMessage } as never,
      { assertValid: vi.fn().mockResolvedValue(undefined) } as never,
      { contactMessage: { create } } as never,
    );

    await expect(service.submit(dto)).resolves.toEqual({
      message: 'Mesajınız uğurla göndərildi. Tezliklə sizinlə əlaqə saxlayacağıq.',
    });
    expect(create).toHaveBeenCalledOnce();
    expect(sendContactMessage).toHaveBeenCalledOnce();
  });

  it('honeypot doludursa DB və e-poçt çağırmır', async () => {
    const create = vi.fn();
    const sendContactMessage = vi.fn();
    const assertValid = vi.fn();
    const service = new ContactService(
      { sendContactMessage } as never,
      { assertValid } as never,
      { contactMessage: { create } } as never,
    );

    await expect(
      service.submit({ ...dto, website: 'https://spam.example' }),
    ).resolves.toMatchObject({ message: expect.stringContaining('uğurla') });
    expect(create).not.toHaveBeenCalled();
    expect(sendContactMessage).not.toHaveBeenCalled();
    expect(assertValid).not.toHaveBeenCalled();
  });
});
