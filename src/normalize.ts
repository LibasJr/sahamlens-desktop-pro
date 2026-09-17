type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

export function displayText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const text = value.map((item) => displayText(item)).filter(Boolean).join(', ');
    return text || fallback;
  }

  const object = record(value);
  if (!object) return fallback;

  for (const key of ['label', 'message', 'text', 'content', 'name', 'code', 'reason']) {
    const text = displayText(object[key]);
    if (text) return text;
  }

  return fallback;
}

export function numericValue(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value !== 'string') {
    const object = record(value);
    return object ? numericValue(object.value, fallback) : fallback;
  }

  const match = value.replace(/,/g, '.').match(/-?\d+(?:\.\d+)?/);
  const parsed = match ? Number(match[0]) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function marketRegimeText(value: unknown, fallback: string): string {
  const object = record(value);
  const marketRegime = record(object?.marketRegime);
  const regime = record(marketRegime?.regime);
  return displayText(regime?.label ?? object?.regime ?? object?.marketRegime, fallback);
}
