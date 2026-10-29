import { productService } from './productService'
import type { Language } from '@/i18n'

type SampleText = { name: string; description: string; category: string }

// Texts of the demo products seeded on first run (see initializeDemoData in electron/main/database.ts)
const SAMPLE_PRODUCTS: Record<string, Record<Language, SampleText>> = {
    DEMO01: {
        es: { name: 'Laptop HP 15', description: '8GB RAM, 256GB SSD', category: 'Electrónica' },
        en: { name: 'HP 15 Laptop', description: '8GB RAM, 256GB SSD', category: 'Electronics' }
    },
    DEMO02: {
        es: { name: 'Mouse Inalámbrico', description: 'Óptico 2.4Ghz', category: 'Accesorios' },
        en: { name: 'Wireless Mouse', description: 'Optical 2.4GHz', category: 'Accessories' }
    },
    DEMO03: {
        es: { name: 'Teclado Mecánico', description: 'RGB Gamer', category: 'Accesorios' },
        en: { name: 'Mechanical Keyboard', description: 'RGB Gaming', category: 'Accessories' }
    },
    DEMO04: {
        es: { name: 'Monitor 24"', description: 'Full HD IPS', category: 'Electrónica' },
        en: { name: '24" Monitor', description: 'Full HD IPS', category: 'Electronics' }
    },
    DEMO05: {
        es: { name: 'Cable HDMI', description: '2 metros 4K', category: 'Cables' },
        en: { name: 'HDMI Cable', description: '2 meters 4K', category: 'Cables' }
    }
}

const FIELDS: (keyof SampleText)[] = ['name', 'description', 'category']

export const sampleDataService = {
    // Translate demo products to the UI language. A field is only changed while it still
    // holds one of the original sample texts, so anything the user edited is left alone.
    async localizeSampleProducts(language: Language): Promise<void> {
        if (!window.electronAPI?.products) return

        const products = await productService.getAll()
        for (const product of products) {
            const sample = SAMPLE_PRODUCTS[product.code]
            if (!sample || !product.id) continue

            const target = sample[language]
            const changes: Partial<SampleText> = {}
            for (const field of FIELDS) {
                const current = product[field] ?? ''
                const isSampleText = Object.values(sample).some(texts => texts[field] === current)
                if (isSampleText && current !== target[field]) changes[field] = target[field]
            }

            if (Object.keys(changes).length > 0) {
                await productService.update(product.id, changes)
            }
        }
    }
}
