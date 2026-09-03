const DEFAULT_TOTAL_STORAGE_GB = 5;

const configuredStorageGb = Number(
  process.env.NEXT_PUBLIC_TOTAL_STORAGE_GB ?? DEFAULT_TOTAL_STORAGE_GB 
);

export const TOTAL_STORAGE_GB =
  Number.isFinite(configuredStorageGb) && configuredStorageGb > 0
    ? configuredStorageGb
    : DEFAULT_TOTAL_STORAGE_GB;

export const TOTAL_STORAGE_BYTES = TOTAL_STORAGE_GB * 1024 * 1024 * 1024;

export function storageUsageColor(usedPercent: number) {
  const redPercentage = Math.min(100, Math.max(0, usedPercent));
  const brandPercentage = 100 - redPercentage;

  return `color-mix(in oklch, var(--primary) ${brandPercentage}%, oklch(0.637 0.237 25.331) ${redPercentage}%)`;
}
