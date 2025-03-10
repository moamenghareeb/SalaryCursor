/**
 * Format a number as currency in EGP
 * @param value - The number to format
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return 'EGP 0';
  return `EGP ${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}; 