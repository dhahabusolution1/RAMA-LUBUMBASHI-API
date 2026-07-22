const LUBUMBASHI_TZ = 'Africa/Lubumbashi';

/** Parse YYYY-MM-DD (ou Date) en date calendrier stable pour @db.Date. */
export function parseDateOnly(input: string | Date): Date {
  if (input instanceof Date) {
    return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  }
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    throw new Error(`Date invalide : ${input}`);
  }
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

function lubumbashiParts(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: LUBUMBASHI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((p) => [p.type, p.value])
  );
  return {
    date: parseDateOnly(`${parts['year']}-${parts['month']}-${parts['day']}`),
    minutes: Number(parts['hour']) * 60 + Number(parts['minute']),
  };
}

export function todayInLubumbashi(): Date {
  return lubumbashiParts().date;
}

export function isPastDate(date: Date): boolean {
  return date.getTime() < todayInLubumbashi().getTime();
}

export function isPastSlot(date: Date, heure: string): boolean {
  const { date: today, minutes: nowMinutes } = lubumbashiParts();
  if (date.getTime() > today.getTime()) return false;
  if (date.getTime() < today.getTime()) return true;
  const [h, min] = heure.split(':').map(Number);
  if (h === undefined || min === undefined) return true;
  return h * 60 + min <= nowMinutes;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
