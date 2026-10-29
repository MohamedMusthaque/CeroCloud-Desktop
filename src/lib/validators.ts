import { z } from 'zod'

// Messages are translation keys; forms translate them when rendering errors

export const productSchema = z.object({
    code: z.string().min(1, 'validation.codeRequired'),
    name: z.string().min(2, 'validation.nameMin'),
    description: z.string().optional(),
    category: z.string().default('General'),
    image: z.string().optional(),
    price: z.coerce.number().min(0, 'validation.priceNegative'),
    cost: z.coerce.number().min(0, 'validation.costNegative').optional().default(0),
    stock: z.coerce.number().int().min(0, 'validation.stockNegative'),
    min_stock: z.coerce.number().int().min(0, 'validation.minStockNegative').default(0),
    unit: z.enum(['unidad', 'kg', 'g', 'l', 'ml', 'm', 'caja', 'paquete']).default('unidad'),
    supplier_id: z.coerce.number().optional(),
})

export type ProductFormValues = z.infer<typeof productSchema>
