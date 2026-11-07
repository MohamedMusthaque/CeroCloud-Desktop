import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'
import { companyService } from '@/services/companyService'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getImageSrc(imagePath?: string) {
    if (!imagePath) return undefined
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath
    // Assume it is a local file managed by NexoraCloud
    // Strip any Windows backslashes that slipped in
    const cleanPath = imagePath.split(/[\\/]/).pop()
    return `nexoracloud-image://${cleanPath}`
}

// Quantities can be decimal (kg, litres...): kept to 3 decimals so sums don't drift (0.1 + 0.2)
export function roundQuantity(value: number) {
    return Math.round(value * 1000) / 1000 + 0
}

// Amount with thousands separators and 2 decimals: 1250000 -> '1,250,000.00' (no symbol, no sign)
// Local date and time for downloaded file names: 2026-11-07_14-30-05 (no ':' — not allowed in Windows file names)
export function fileStamp(date: Date = new Date()) {
    return format(date, 'yyyy-MM-dd_HH-mm-ss')
}

export function formatAmount(amount: number, decimals = 2) {
    return Math.abs(Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

// Uses the currency symbol configured in Settings, like the rest of the UI (printouts pass their own)
export function formatCurrency(amount: number, currencySymbol = companyService.getSettings().currencySymbol) {
    // Sign before the symbol: -$5.00 (losses); amounts that round to zero carry no sign
    return `${amount <= -0.005 ? '-' : ''}${currencySymbol}${formatAmount(amount)}`
}
