import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Info, Package, Boxes, DollarSign, AlertTriangle, User, Phone, Mail, MapPin, Contact } from 'lucide-react'
import { useTranslation, unitLabel } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import { supplierService } from '@/services/supplierService'
import { productService } from '@/services/productService'
import { companyService } from '@/services/companyService'
import type { Product, Supplier } from '@/types/database'
import {
    ViewHeader, ViewAvatar, ViewBadge, ViewSection, ViewFields, ViewField, ViewAudit, ViewStat,
    ViewTable, ViewLink, ViewNic, ViewLoading, ViewNotFound, viewCellClass, viewLinkClass
} from '@/components/view/ViewPage'
import { useRecord, parseId } from '@/components/view/useRecord'
import { SupplierForm } from './SupplierForm'

export function SupplierView() {
    const { t } = useTranslation()
    const supplierId = parseId(useParams().id)
    const [editing, setEditing] = useState(false)

    const load = useCallback(async (): Promise<{ supplier: Supplier; products: Product[] } | null> => {
        if (!supplierId) return null
        const [supplier, products] = await Promise.all([supplierService.getById(supplierId), productService.getAll()])
        return supplier ? { supplier, products: products.filter(p => p.supplier_id === supplierId) } : null
    }, [supplierId])
    const { data, loading, reload } = useRecord(load)

    const backLabel = t('view.backTo', { page: t('nav.suppliers') })
    if (loading) return <ViewLoading />
    if (!data) return <ViewNotFound backTo="/suppliers" backLabel={backLabel} />

    const { supplier, products } = data
    const settings = companyService.getSettings()
    // Same rule as the inventory list
    const isLow = (p: Product) => p.stock <= (settings.inventory?.lowStockThreshold ?? p.min_stock)
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
    const stockCost = products.reduce((sum, p) => sum + p.stock * (p.cost ?? 0), 0)
    const lowStock = products.filter(isLow).length

    return (
        <div className="space-y-6 pb-20 p-2">
            <ViewHeader
                backTo="/suppliers"
                backLabel={backLabel}
                avatar={<ViewAvatar gradient="from-indigo-500 to-purple-600">{supplier.name.charAt(0).toUpperCase()}</ViewAvatar>}
                title={supplier.name}
                subtitle={supplier.contact || undefined}
                badges={<>
                    <ViewBadge tone="primary" icon={Package}>{t('view.productsCount', { count: products.length })}</ViewBadge>
                    {supplier.nic_attachment && <ViewBadge tone="green" icon={Contact}>{t('nic.attached')}</ViewBadge>}
                </>}
                onEdit={() => setEditing(true)}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ViewStat label={t('view.products')} value={products.length} icon={Package} color="bg-blue-500" />
                <ViewStat label={t('view.category.totalStock')} value={totalStock} icon={Boxes} color="bg-purple-500" />
                <ViewStat label={t('view.supplier.stockCost')} value={formatCurrency(stockCost)} icon={DollarSign} color="bg-green-500" />
                <ViewStat label={t('view.product.lowStock')} value={lowStock} icon={AlertTriangle} color={lowStock > 0 ? 'bg-red-500' : 'bg-gray-500'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ViewSection title={t('view.contactDetails')} icon={Info} className="lg:col-span-2">
                    <ViewFields>
                        <ViewField label={t('view.name')} value={supplier.name} />
                        <ViewField label={t('view.supplier.contact')} value={supplier.contact} icon={User} />
                        <ViewField label={t('view.phone')} value={supplier.phone && <a href={`tel:${supplier.phone}`} className={viewLinkClass}>{supplier.phone}</a>} icon={Phone} />
                        <ViewField label={t('view.email')} value={supplier.email && <a href={`mailto:${supplier.email}`} className={viewLinkClass}>{supplier.email}</a>} icon={Mail} />
                        <ViewField label={t('view.address')} value={supplier.address} icon={MapPin} wide />
                        <ViewField label={t('nic.label')} value={<ViewNic filename={supplier.nic_attachment} />} icon={Contact} wide />
                    </ViewFields>
                </ViewSection>
                <ViewAudit record={supplier} />
            </div>

            <ViewSection title={t('view.supplier.products')} icon={Package}>
                <ViewTable
                    columns={[
                        { label: t('view.product.name') }, { label: t('view.product.category') },
                        { label: t('view.product.cost'), align: 'right' }, { label: t('view.product.price'), align: 'right' },
                        { label: t('view.product.stock'), align: 'right' }
                    ]}
                    empty={products.length === 0 ? t('sup.noProducts') : undefined}
                >
                    {products.map(product => (
                        <tr key={product.id}>
                            <td className={viewCellClass}>
                                <ViewLink to={`/inventory/${product.id}`} page="inventory">{product.name}</ViewLink>
                                <p className="text-xs text-gray-500 font-mono">{product.code}</p>
                            </td>
                            <td className={viewCellClass}>{product.category || t('inv.noCategory')}</td>
                            <td className={cn(viewCellClass, "text-right")}>{product.cost ? formatCurrency(product.cost) : '-'}</td>
                            <td className={cn(viewCellClass, "text-right")}>{formatCurrency(product.price)}</td>
                            <td className={cn(viewCellClass, "text-right font-medium", isLow(product) ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                                {product.stock} {unitLabel(product.unit)}
                            </td>
                        </tr>
                    ))}
                </ViewTable>
            </ViewSection>

            {editing && (
                <SupplierForm supplier={supplier} onClose={() => { setEditing(false); reload() }} />
            )}
        </div>
    )
}
