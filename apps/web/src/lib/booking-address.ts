/** Küçə ünvanına blok / mərtəbə / qapı əlavə edir (boş hissələr atılır). */
export function composeBookingAddress(parts: {
  street: string;
  block?: string;
  floor?: string;
  door?: string;
}): string {
  const segments: string[] = [];
  const street = parts.street.trim();
  if (street) segments.push(street);

  const block = parts.block?.trim();
  const floor = parts.floor?.trim();
  const door = parts.door?.trim();
  if (block) segments.push(`Blok ${block}`);
  if (floor) segments.push(`Mərtəbə ${floor}`);
  if (door) segments.push(`Qapı ${door}`);

  return segments.join(', ');
}
