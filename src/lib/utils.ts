import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
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

// Uses the currency symbol configured in Settings, like the rest of the UI
export function formatCurrency(amount: number) {
    const { currencySymbol } = companyService.getSettings()
    const formatted = Math.abs(amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    // Sign before the symbol: -$5.00 (losses); amounts that round to zero carry no sign
    return `${amount <= -0.005 ? '-' : ''}${currencySymbol}${formatted}`
}
