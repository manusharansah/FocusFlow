export const STATUSES = [
  { key: 'todo', label: 'To do' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'done', label: 'Done' },
];
export const PRIORITIES = [
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
];

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

export function parseDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDue(iso) {
  const d = parseDate(iso);
  if (!d) return '';
  const diff = Math.round((d - startOfToday()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

export const isOverdue = (task) => !task.completed && task.due_date && parseDate(task.due_date) < startOfToday();

export function formatMoney(minorUnits, currency) {
  const code = currency.toUpperCase();
  const digits = new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).resolvedOptions().maximumFractionDigits;
  const major = minorUnits / 10 ** digits;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: code, minimumFractionDigits: Number.isInteger(major) ? 0 : digits }).format(major);
}
