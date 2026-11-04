import { describe, expect, it } from 'vitest';
import { formatDue, formatMoney, isOverdue, parseDate } from './format';

const iso = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

describe('format helpers', () => {
  it('labels relative due dates', () => {
    expect(formatDue(iso(0))).toBe('Today');
    expect(formatDue(iso(1))).toBe('Tomorrow');
    expect(formatDue(null)).toBe('');
  });
  it('parses ISO dates in local time (no off-by-one)', () => {
    expect(parseDate('2026-03-05').getDate()).toBe(5);
  });
  it('flags overdue only for open tasks', () => {
    expect(isOverdue({ completed: false, due_date: iso(-1) })).toBe(true);
    expect(isOverdue({ completed: true, due_date: iso(-1) })).toBe(false);
    expect(isOverdue({ completed: false, due_date: iso(0) })).toBe(false);
  });
  it('formats money from minor units', () => {
    expect(formatMoney(999, 'usd')).toContain('9.99');
    expect(formatMoney(9900, 'usd')).toContain('99');
  });
});
