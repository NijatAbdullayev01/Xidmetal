/**
 * Sifariş status keçidlərində in-app bildiriş qaydaları (saf funksiyalar — unit test üçün).
 */

/** CONFIRMED / REJECTED → müştəriyə: provider və ya admin aktoru */
export function shouldNotifyCustomerOnConfirmOrReject(
  isProvider: boolean,
  isAdmin: boolean,
): boolean {
  return isProvider || isAdmin;
}
