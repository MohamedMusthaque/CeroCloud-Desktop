import { CompanySettings } from '@/types/database'

const STORAGE_KEY = 'nexoracloud_company_settings'

const defaultSettings: CompanySettings = {
    name: 'NexoraCloud',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo: '',
    taxId: '',

    // Sales Defaults
    currency: 'GTQ',
    currencySymbol: 'Q',
    locale: 'es-GT',
    taxRate: 12,
    enableTax: true,
    taxIncluded: true,

    // POS Defaults
    enableDiscounts: true,
    requireCustomerName: false,
    askPaymentMethod: true,
    pos: {
        autoConfirm: false,
        showChangeCalculation: true,
        allowNegativeStock: false,
        soundEffects: true
    },

    paymentMethods: {
        cash: true,
        card: true,
        transfer: true,
        other: false,
        credit: false,
        cheque: false
    },

    invoice: {
        prefix: 'FAC-',
        nextNumber: 1,
        disclaimer: '' // Empty uses the translated default thank-you message
    },

    inventory: {
        lowStockThreshold: 5,
        showVisualAlerts: true
    },

    backup: {
        autoBackup: false,
        frequency: 'weekly',
        time: '02:00'
    },

    theme: {
        mode: 'system',
        density: 'normal',
        fontSize: 'normal',
        borderRadius: 'normal'
    },

    security: {
        enablePin: false,
        lockSettings: false
    },

    updates: {
        autoCheck: true
    }
}

export const companyService = {
    // Get company settings
    getSettings: (): CompanySettings => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored) {
                // Merge stored settings with defaults to ensure new fields (like currencySymbol) exist
                const parsed = JSON.parse(stored)
                // Payment methods added later (credit, cheque) start from their default instead of missing
                return { ...defaultSettings, ...parsed, paymentMethods: { ...defaultSettings.paymentMethods, ...parsed.paymentMethods } }
            }
            return defaultSettings
        } catch (error) {
            console.error('Error loading company settings:', error)
            return defaultSettings
        }
    },

    // Save company settings
    saveSettings: (settings: CompanySettings): boolean => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
            // Dispatch event for reactive updates in other components
            window.dispatchEvent(new Event('company-settings-changed'))
            return true
        } catch (error) {
            console.error('Error saving company settings:', error)
            return false
        }
    },

    // Update logo
    updateLogo: (logoBase64: string): boolean => {
        try {
            const settings = companyService.getSettings()
            settings.logo = logoBase64
            return companyService.saveSettings(settings)
        } catch (error) {
            console.error('Error updating logo:', error)
            return false
        }
    },

    // Remove logo
    removeLogo: (): boolean => {
        try {
            const settings = companyService.getSettings()
            settings.logo = ''
            return companyService.saveSettings(settings)
        } catch (error) {
            console.error('Error removing logo:', error)
            return false
        }
    },

    // Apply theme to document
    applyTheme: (mode: 'light' | 'dark' | 'system') => {
        try {
            const root = document.documentElement
            const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

            root.classList.remove('light', 'dark')
            if (isDark) {
                root.classList.add('dark')
            } else {
                root.classList.add('light')
            }
        } catch (error) {
            console.error('Error applying theme:', error)
        }
    },

    // Apply UI Scaling (fontSize and borderRadius)
    applyUIScaling: (fontSize: string, borderRadius: string) => {
        try {
            const root = document.documentElement

            // Font Size Scale (affects rem base)
            const fontSizeMap: Record<string, string> = {
                'small': '14px',
                'normal': '16px',
                'large': '18px',
                'xlarge': '20px'
            }

            // Border Radius Scale
            const radiusMap: Record<string, string> = {
                'none': '0px',
                'small': '0.25rem',
                'normal': '0.5rem',
                'large': '1rem'
            }

            root.style.fontSize = fontSizeMap[fontSize] || fontSizeMap.normal
            root.style.setProperty('--radius', radiusMap[borderRadius] || radiusMap.normal)
        } catch (error) {
            console.error('Error applying UI scaling:', error)
        }
    },

    // Apply Density (Normal vs Compact)
    applyDensity: (density: 'normal' | 'compact') => {
        try {
            const root = document.documentElement
            if (density === 'compact') {
                root.classList.add('compact')
            } else {
                root.classList.remove('compact')
            }
        } catch (error) {
            console.error('Error applying density:', error)
        }
    },

    // Initialize theme on app start
    initTheme: () => {
        const settings = companyService.getSettings()
        if (settings.theme?.mode) {
            companyService.applyTheme(settings.theme.mode)
        }
        if (settings.theme?.fontSize && settings.theme?.borderRadius) {
            companyService.applyUIScaling(settings.theme.fontSize, settings.theme.borderRadius)
        }
        if (settings.theme?.density) {
            companyService.applyDensity(settings.theme.density)
        }
    }
}
