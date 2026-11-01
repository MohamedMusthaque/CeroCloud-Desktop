import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Tags, Info, Package, Boxes, DollarSign, AlertTriangle } from 'lucide-react'
import { useTranslation, unitLabel } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import { categoryService } from '@/services/categoryService'
import { productService } from '@/services/productService'
import { companyService } from '@/services/companyService'
import type { Category, Product } from '@/types/database'
import {
    ViewHeader, ViewAvatar, ViewBadge, ViewSection, ViewFields, ViewField, ViewAudit, ViewStat,
    ViewTable, ViewLink, ViewLoading, ViewNotFound, viewCellClass
} from '@/components/view/ViewPage'
import { useRecord, parseId } from '@/components/view/useRecord'
import { CategoryForm } from './Categories'

// The inventory page opens on its Categories section with this
const BACK_TO = '/inventory?section=categories'

export function CategoryView() {
    const { t } = useTranslation()
    const categoryId = parseId(useParams().id)
    const [editing, setEditing] = useState(false)

    const load = useCallback(async (): Promise<{ category: Category; products: Product[] } | null> => {
        if (!categoryId) return null
        const [categories, products] = await Promise.all([categoryService.getAll(), productService.getAll()])
        const category = categories.find(c => c.id === categoryId)
        // Products store the category by name
        return category ? { category, products: products.filter(p => p.category === category.name) } : null
    }, [categoryId])
    const { data, loading, reload } = useRecord(load)

    const backLabel = t('view.backTo', { page: t('inv.section.categories') })
    if (loading) return <ViewLoading />
    if (!data) return <ViewNotFound backTo={BACK_TO} backLabel={backLabel} />

    const { category, products } = data
    const settings = companyService.getSettings()
    // Same rule as the inventory list
    const isLow = (p: Product) => p.stock <= (settings.inventory?.lowStockThreshold ?? p.min_stock)
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
    const stockValue = products.reduce((sum, p) => sum + p.stock * p.price, 0)
    const lowStock = products.filter(isLow).length

    return (
        <div className="space-y-6 pb-20 p-2">
            <ViewHeader
                backTo={BACK_TO}
                backLabel={backLabel}
                avatar={<ViewAvatar gradient="from-primary to-purple-600"><Tags className="w-8 h-8" /></ViewAvatar>}
                title={category.name}
                badges={<ViewBadge tone="primary" icon={Package}>{t('view.productsCount', { count: products.length })}</ViewBadge>}
                onEdit={() => setEditing(true)}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ViewStat label={t('view.products')} value={products.length} icon={Package} color="bg-blue-500" />
                <ViewStat label={t('view.category.totalStock')} value={totalStock} icon={Boxes} color="bg-purple-500" />
                <ViewStat label={t('view.product.stockValue')} value={formatCurrency(stockValue)} icon={DollarSign} color="bg-green-500" />
                <ViewStat label={t('view.product.lowStock')} value={lowStock} icon={AlertTriangle} color={lowStock > 0 ? 'bg-red-500' : 'bg-gray-500'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ViewSection title={t('view.details')} icon={Info} className="lg:col-span-2">
                    <ViewFields>
                        <ViewField label={t('view.name')} value={category.name} />
                        <ViewField label={t('view.products')} value={products.length} />
                        <ViewField label={t('view.description')} value={category.description} wide />
                    </ViewFields>
                </ViewSection>
                <ViewAudit record={category} />
            </div>

            <ViewSection title={t('view.products')} icon={Package}>
                <ViewTable
                    columns={[
                        { label: t('view.product.name') }, { label: t('view.product.code') },
                        { label: t('view.product.price'), align: 'right' }, { label: t('view.product.stock'), align: 'right' }
                    ]}
                    empty={products.length === 0 ? t('view.category.noProducts') : undefined}
                >
                    {products.map(product => (
                        <tr key={product.id}>
                            <td className={viewCellClass}><ViewLink to={`/inventory/${product.id}`} page="inventory">{product.name}</ViewLink></td>
                            <td className={cn(viewCellClass, "font-mono")}>{product.code}</td>
                            <td className={cn(viewCellClass, "text-right")}>{formatCurrency(product.price)}</td>
                            <td className={cn(viewCellClass, "text-right font-medium", isLow(product) ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                                {product.stock} {unitLabel(product.unit)}
                            </td>
                        </tr>
                    ))}
                </ViewTable>
            </ViewSection>

            <CategoryForm
                isOpen={editing}
                category={category}
                onClose={() => setEditing(false)}
                onSaved={() => reload()}
            />
        </div>
    )
}
