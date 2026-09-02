/**
 * Pure formatting helpers for CV date fields (RenderCV uses YYYY-MM or
 * "present"). No I/O — kept out of components so every section formats
 * dates the same way.
 */
export function formatYear(isoDate: string | undefined): string {
  if (!isoDate) return '';
  if (isoDate.toLowerCase() === 'present') return 'PRESENT';

  const year = isoDate.split('-')[0];
  return year ?? isoDate;
}

export function formatYearRange(start: string | undefined, end: string | undefined): string {
  const startYear = formatYear(start);
  const endYear = formatYear(end);

  if (!startYear && !endYear) return '';
  if (!endYear) return startYear;

  return `${startYear} — ${endYear}`;
}

/** Strips RenderCV's `[Name](url)` markdown link syntax down to plain name + optional href. */
export function parseLinkedName(raw: string): { name: string; href: string | null } {
  const match = raw.match(/^\[(.+)\]\((.+)\)$/);

  if (match) return { name: match[1], href: match[2] };

  return { name: raw, href: null };
}
