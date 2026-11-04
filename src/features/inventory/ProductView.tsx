import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Package, Info, DollarSign, Boxes, ShoppingCart, TrendingUp, AlertTriangle, CheckCircle2, Receipt, CalendarClock, PackagePlus, History } from 'lucide-react'
import { useTranslation, unitLabel } from '@/i18n'
import { cn, formatCurrency, getImageSrc } from '@/lib/utils'
import { productService } from '@/services/productService'
import { saleService } from '@/services/saleService'
import { categoryService } from '@/services/categoryService'
import { supplierService } from '@/services/supplierService'
import { companyService } from '@/services/companyService'
import { goodsReceiptService } from '@/services/purchaseService'
import { inventoryLogService } from '@/services/inventoryLogService'
import { StockMovementsTable } from '@/components/view/StockMovementsTable'
import { movementTotals } from '@/lib/stockMovements'
import type { Category, GoodsReceipt, InventoryLog, Product, Sale, Supplier } from '@/types/database'
import { LazyImage } from '@/components/ui/LazyImage'
import {
    ViewHeader, ViewAvatar, ViewBadge, ViewSection, ViewFields, ViewField, ViewAudit, ViewStat,
    ViewTable, ViewLink, ViewSaleStatus, ViewLoading, ViewNotFound, viewCellClass
} from '@/components/view/ViewPage'
import { useRecord, parseId } from '@/components/view/useRecord'
import { ProductForm } from './ProductForm'
import { grnId } from '@/features/purchases/purchaseUi'

// Most recent sales listed on the page; the stats still cover every sale
const SALES_SHOWN = 50

interface ProductRecord {
    product: Product
    sales: Sale[]
    category: Category | null
    supplier: Supplier | null
    // Goods Received Notes that brought this product in from clients
    receipts: GoodsReceipt[]
    // Stock card, newest first
    movements: InventoryLog[]
}

export function ProductView() {
    const { t, locale } = useTranslation()
    const productId = parseId(useParams().id)
    const [editing, setEditing] = useState(false)

    const load = useCallback(async (): Promise<ProductRecord | null> => {
        if (!productId) return null
        const product = await productService.getById(productId)
        if (!product) return null
        const [sales, categories, supplier, receipts, movements] = await Promise.all([
            saleService.getByProductId(productId),
            categoryService.getAll(),
            product.supplier_id ? supplierService.getById(product.supplier_id) : Promise.resolve(null),
            goodsReceiptService.getAll(),
            inventoryLogService.getByProductId(productId)
        ])
        // Products store the category by name
        return { product, sales, category: categories.find(c => c.name === product.category) ?? null, supplier: supplier ?? null, receipts: receipts.filter(r => r.items?.some(i => i.product_id === productId)), movements }
    }, [productId])
    const { data, loading, reload } = useRecord(load)

    const backLabel = t('view.backTo', { page: t('nav.inventory') })
    if (loading) return <ViewLoading />
    if (!data) return <ViewNotFound backTo="/inventory" backLabel={backLabel} />

    const { product, sales, category, supplier, receipts, movements } = data
    const settings = companyService.getSettings()
    // Same rule as the inventory list
    const isLowStock = product.stock <= (settings.inventory?.lowStockThreshold ?? product.min_stock)
    const unit = unitLabel(product.unit)
    const hasCost = product.cost !== undefined && product.cost !== null && product.cost > 0
    const margin = hasCost ? product.price - product.cost! : null
    const marginPercent = margin !== null && product.price > 0 ? (margin / product.price) * 100 : null

    // This product's lines across its completed sales
    const lines = sales.flatMap(sale => sale.items.filter(item => item.product_id === product.id).map(item => ({ sale, item })))
    const completed = lines.filter(line => line.sale.status === 'completed')
    const unitsSold = completed.reduce((sum, line) => sum + line.item.quantity, 0)
    const revenue = completed.reduce((sum, line) => sum + line.item.subtotal, 0)
    const lastSold = completed[0]?.sale.created_at

    // This product's lines across its Goods Received Notes
    const receiptLines = receipts.flatMap(receipt => (receipt.items ?? []).filter(item => item.product_id === product.id).map(item => ({ receipt, item })))
    const receivedLines = receiptLines.filter(line => line.receipt.status === 'completed')
    const unitsReceived = Math.round(receivedLines.reduce((sum, line) => sum + line.item.quantity, 0) * 1000) / 1000
    const paidForReceived = receivedLines.reduce((sum, line) => sum + line.item.subtotal, 0)
    const moved = movementTotals(movements)

    return (
        <div className="space-y-6 pb-20 p-2">
            <ViewHeader
                backTo="/inventory"
                backLabel={backLabel}
                avatar={<ViewAvatar gradient="from-primary to-indigo-600"><Package className="w-8 h-8" /></ViewAvatar>}
                title={product.name}
                subtitle={<span className="font-mono text-sm">{product.code}</span>}
                badges={<>
                    <ViewBadge tone={isLowStock ? 'red' : 'green'} icon={isLowStock ? AlertTriangle : CheckCircle2}>
                        {isLowStock ? t('view.product.lowStock') : t('view.product.inStock')}
                    </ViewBadge>
                    <ViewBadge>{product.category || t('inv.noCategory')}</ViewBadge>
                </>}
                onEdit={() => setEditing(true)}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ViewStat label={t('view.product.stock')} value={`${product.stock} ${unit}`} hint={t('view.product.minStockHint', { count: product.min_stock })} icon={Boxes} color={isLowStock ? 'bg-red-500' : 'bg-green-500'} />
                <ViewStat label={t('view.product.stockValue')} value={formatCurrency(product.stock * product.price)} hint={hasCost ? t('view.product.atCost', { amount: formatCurrency(product.stock * product.cost!) }) : undefined} icon={DollarSign} color="bg-blue-500" />
                <ViewStat label={t('view.product.unitsSold')} value={unitsSold} hint={lastSold ? t('view.product.lastSold', { date: new Date(lastSold).toLocaleDateString(locale) }) : undefined} icon={ShoppingCart} color="bg-purple-500" />
                <ViewStat label={t('view.product.revenue')} value={formatCurrency(revenue)} icon={TrendingUp} color="bg-orange-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Image */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {product.image ? (
                        <LazyImage
                            src={getImageSrc(product.image)!}
                            alt={product.name}
                            aspectRatio="aspect-square"
                            fallback={<div className="w-full h-full flex items-center justify-center"><Package className="w-16 h-16 text-gray-300 dark:text-gray-600" /></div>}
                        />
                    ) : (
                        <div className="aspect-square w-full bg-gray-100 dark:bg-gray-700 flex flex-col items-center justify-center gap-2 text-gray-400">
                            <Package className="w-16 h-16" />
                            <span className="text-sm">{t('view.product.noImage')}</span>
                        </div>
                    )}
                </div>

                <ViewSection title={t('view.details')} icon={Info} className="lg:col-span-2">
                    <ViewFields>
                        <ViewField label={t('view.product.code')} value={product.code} mono />
                        <ViewField label={t('view.product.name')} value={product.name} />
                        <ViewField
                            label={t('view.product.category')}
                            value={category
                                ? <ViewLink to={`/inventory/categories/${category.id}`} page="inventory">{category.name}</ViewLink>
                                : product.category || undefined}
                        />
                        <ViewField
                            label={t('view.product.supplier')}
                            value={supplier ? <ViewLink to={`/suppliers/${supplier.id}`} page="suppliers">{supplier.name}</ViewLink> : undefined}
                        />
                        <ViewField label={t('view.product.unit')} value={unit} />
                        <ViewField label={t('view.product.minStock')} value={`${product.min_stock} ${unit}`} />
                        <ViewField label={t('view.description')} value={product.description} wide />
                    </ViewFields>
                </ViewSection>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ViewSection title={t('view.product.pricing')} icon={DollarSign} className="lg:col-span-2">
                    <ViewFields>
                        <ViewField label={t('view.product.price')} value={formatCurrency(product.price)} />
                        <ViewField label={t('view.product.cost')} value={hasCost ? formatCurrency(product.cost!) : undefined} />
                        <ViewField label={t('view.product.margin')} value={margin !== null ? formatCurrency(margin) : undefined} />
                        <ViewField label={t('view.product.marginPercent')} value={marginPercent !== null ? `${marginPercent.toFixed(1)}%` : undefined} />
                    </ViewFields>
                </ViewSection>
                <ViewAudit record={product} />
            </div>

            <ViewSection
                title={t('view.product.sales')}
                icon={Receipt}
                actions={lines.length > SALES_SHOWN && <span className="text-xs text-gray-500">{t('view.showingLatest', { shown: SALES_SHOWN, total: lines.length })}</span>}
            >
                <ViewTable
                    columns={[
                        { label: t('view.sale.number') }, { label: t('view.sale.date') }, { label: t('view.sale.customer') },
                        { label: t('view.sale.qty'), align: 'right' }, { label: t('view.sale.unitPrice'), align: 'right' },
                        { label: t('view.sale.subtotal'), align: 'right' }, { label: t('view.sale.status') }
                    ]}
                    empty={lines.length === 0 ? t('view.product.noSales') : undefined}
                >
                    {lines.slice(0, SALES_SHOWN).map(({ sale, item }) => (
                        <tr key={`${sale.id}-${item.id}`} className={cn(sale.status === 'cancelled' && "opacity-60")}>
                            <td className={cn(viewCellClass, "font-mono")}>#{sale.id}</td>
                            <td className={cn(viewCellClass, "whitespace-nowrap")}>
                                <span className="inline-flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5 text-gray-400" />{new Date(sale.created_at!).toLocaleString(locale)}</span>
                            </td>
                            <td className={viewCellClass}>
                                {sale.client_id
                                    ? <ViewLink to={`/clients/${sale.client_id}`} page="clients">{sale.customer_name || t('common.walkInCustomer')}</ViewLink>
                                    : sale.customer_name || t('common.walkInCustomer')}
                            </td>
                            <td className={cn(viewCellClass, "text-right")}>{item.quantity}</td>
                            <td className={cn(viewCellClass, "text-right")}>{formatCurrency(item.unit_price)}</td>
                            <td className={cn(viewCellClass, "text-right font-bold text-gray-900 dark:text-white")}>{formatCurrency(item.subtotal)}</td>
                            <td className={viewCellClass}><ViewSaleStatus status={sale.status} /></td>
                        </tr>
                    ))}
                </ViewTable>
            </ViewSection>

            <ViewSection
                title={t('grnView.productSection')}
                icon={PackagePlus}
                actions={receivedLines.length > 0 && (
                    <span className="text-xs text-gray-500">
                        {t('grnView.productSummary', { quantity: `${unitsReceived} ${unit}`, amount: formatCurrency(paidForReceived) })}
                    </span>
                )}
            >
                <ViewTable
                    columns={[
                        { label: t('grn.col.number') }, { label: t('grn.col.date') }, { label: t('grn.col.client') },
                        { label: t('view.sale.qty'), align: 'right' }, { label: t('purForm.unitCost'), align: 'right' },
                        { label: t('view.sale.subtotal'), align: 'right' }, { label: t('grn.col.status') }
                    ]}
                    empty={receiptLines.length === 0 ? t('grnView.productNone') : undefined}
                >
                    {receiptLines.slice(0, SALES_SHOWN).map(({ receipt, item }) => (
                        <tr key={`${receipt.id}-${item.id}`} className={cn(receipt.status === 'cancelled' && "opacity-60")}>
                            <td className={cn(viewCellClass, "font-mono whitespace-nowrap")}>
                                <ViewLink to={`/purchases/grn/${receipt.id}`} page="purchases">{t('grn.number', { id: grnId(receipt.id) })}</ViewLink>
                            </td>
                            <td className={cn(viewCellClass, "whitespace-nowrap")}>{new Date(`${receipt.receipt_date}T00:00:00`).toLocaleDateString(locale)}</td>
                            <td className={viewCellClass}>
                                {receipt.client_id
                                    ? <ViewLink to={`/clients/${receipt.client_id}`} page="clients">{receipt.client_name}</ViewLink>
                                    : `${receipt.client_name} (${t('grn.walkIn')})`}
                            </td>
                            <td className={cn(viewCellClass, "text-right")}>{item.quantity}</td>
                            <td className={cn(viewCellClass, "text-right")}>{formatCurrency(item.unit_cost)}</td>
                            <td className={cn(viewCellClass, "text-right font-bold text-gray-900 dark:text-white")}>{formatCurrency(item.subtotal)}</td>
                            <td className={viewCellClass}>{t(`grn.status.${receipt.status}`)}</td>
                        </tr>
                    ))}
                </ViewTable>
            </ViewSection>

            <ViewSection
                title={t('stock.productTitle')}
                icon={History}
                actions={movements.length > 0 && (
                    <span className="text-xs text-gray-500">
                        {t('stock.summary', { in: `${moved.in} ${unit}`, out: `${moved.out} ${unit}` })}
                        {movements.length > SALES_SHOWN && ` · ${t('view.showingLatest', { shown: SALES_SHOWN, total: movements.length })}`}
                    </span>
                )}
            >
                <StockMovementsTable logs={movements.slice(0, SALES_SHOWN)} />
            </ViewSection>

            {editing && (
                <ProductForm product={product} onClose={() => { setEditing(false); reload() }} />
            )}
        </div>
    )
}
