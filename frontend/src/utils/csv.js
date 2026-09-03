/**
 * Splits a single CSV line into fields, respecting double-quoted fields
 * (which may contain commas and escaped "" quotes) instead of naively
 * splitting on every comma — e.g. a question like `"What is X, and why?"`
 * or a name like `"Doe, John"` must not be torn apart at the inner comma.
 */
export function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}
