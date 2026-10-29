import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { companyService } from '@/services/companyService'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getImageSrc(imagePath?: string) {
    if (!imagePath) return undefined
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) return imagePath
    // Asumimos que es un archivo local gestionado por CeroCloud
    // Removemos posibles barras invertidas de Windows si se colaron
    const cleanPath = imagePath.split(/[\\/]/).pop()
    return `cerocloud-image://${cleanPath}`
}

// Uses the currency symbol configured in Settings, like the rest of the UI
export function formatCurrency(amount: number) {
    const { currencySymbol } = companyService.getSettings()
    return `${currencySymbol}${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
