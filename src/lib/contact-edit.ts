/** Validate editable contact details without accepting ownership or consent fields. */
export function contactDetailUpdates(body: Record<string, unknown>) {
  const updates: Record<string, unknown> = {};
  const text = (value: unknown, max: number) => {
    if (typeof value !== 'string' || value.length > max) throw new Error('Invalid contact detail');
    return value.trim();
  };
  for (const field of ['firstName', 'lastName']) if (body[field] !== undefined) updates[field] = text(body[field], 150);
  if (updates.firstName === '') throw new Error('First name is required');
  for (const [field, valueKey, labels] of [
    ['phones', 'number', ['mobile', 'home', 'work', 'other']],
    ['emails', 'address', ['personal', 'work', 'other']],
  ] as const) {
    if (body[field] === undefined) continue;
    const rows = body[field];
    if (!Array.isArray(rows) || rows.length > 30) throw new Error('Invalid contact details list');
    const normalized = rows.map(row => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Invalid contact detail');
      let value = text(row[valueKey], 254);
      if (field === 'emails') {
        value = value.toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Enter a valid email address');
      } else if (!/^[+\d\s().-]+$/.test(value) || value.replace(/\D/g, '').length < 7 || value.replace(/\D/g, '').length > 15) throw new Error('Enter a valid phone number');
      if (row.label !== undefined && !(labels as readonly string[]).includes(row.label)) throw new Error('Invalid contact detail label');
      return { [valueKey]: value, label: row.label || labels[0], isPrimary: row.isPrimary === true, isValid: row.isValid !== false, ...(field === 'phones' ? { country: row.country === undefined ? 'US' : text(row.country, 100) } : {}) };
    });
    if (normalized.filter(row => row.isPrimary).length > 1) throw new Error('Choose only one primary contact detail');
    if (normalized.length && !normalized.some(row => row.isPrimary)) normalized[0].isPrimary = true;
    updates[field] = normalized;
    updates[field === 'phones' ? 'phone' : 'email'] = normalized.find(row => row.isPrimary)?.[valueKey] || '';
  }
  if (body.address !== undefined) {
    if (!body.address || typeof body.address !== 'object' || Array.isArray(body.address)) throw new Error('Invalid address');
    const address = body.address as Record<string, unknown>;
    updates.address = Object.fromEntries(['street', 'city', 'state', 'zip', 'country'].filter(key => address[key] !== undefined).map(key => [key, text(address[key], key === 'street' ? 300 : 100)]));
  }
  return updates;
}
