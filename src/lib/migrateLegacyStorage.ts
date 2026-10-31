// La app se llamaba CeroCloud: copiar las claves antiguas de localStorage a las nuevas.
// Se importa primero en main.tsx para que corra antes de que los stores lean localStorage.
const LEGACY_KEYS: Record<string, string> = {
    'cerocloud_company_settings': 'nexoracloud_company_settings',
    'cerocloud-language': 'nexoracloud-language',
    'cerocloud-ui-store': 'nexoracloud-ui-store',
}

try {
    for (const [oldKey, newKey] of Object.entries(LEGACY_KEYS)) {
        const value = localStorage.getItem(oldKey)
        if (value === null) continue
        if (localStorage.getItem(newKey) === null) {
            localStorage.setItem(newKey, value)
        }
        localStorage.removeItem(oldKey)
    }

    // El nombre de empresa por defecto era "CeroCloud"
    const settings = localStorage.getItem('nexoracloud_company_settings')
    if (settings) {
        const parsed = JSON.parse(settings)
        if (parsed.name === 'CeroCloud') {
            parsed.name = 'NexoraCloud'
            localStorage.setItem('nexoracloud_company_settings', JSON.stringify(parsed))
        }
    }
} catch (error) {
    console.error('Error migrating legacy localStorage keys:', error)
}

export {}
