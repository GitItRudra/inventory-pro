const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export const inr = (n) => currency.format(Number(n) || 0);
export const dateTime = (d) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
export const dateOnly = (d) => new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' });
