export function visiblePageNumbers(
  page: number,
  totalPages: number,
): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const set = new Set<number>([1, totalPages, page, page - 1, page + 1, page - 2, page + 2]);
  const sorted = [...set].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);

  const result: Array<number | 'ellipsis'> = [];
  for (const value of sorted) {
    const prev = result[result.length - 1];
    if (typeof prev === 'number' && value - prev > 1) {
      result.push('ellipsis');
    }
    result.push(value);
  }
  return result;
}
