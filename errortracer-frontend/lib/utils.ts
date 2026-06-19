import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const countFormatter = new Intl.NumberFormat("en-US")
const compactCountFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

export function formatCount(value: number) {
  if (!Number.isFinite(value)) {
    return "0"
  }

  if (Math.abs(value) <= 9_999) {
    return countFormatter.format(value)
  }

  return compactCountFormatter.format(value).replace("K", "k")
}
