import { useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import { companyService } from '@/services/companyService'
import type { Product } from '@/types/database'
import { emptyGoodsRow, goodsTotal, type GoodsRow } from './goodsRows'

interface GoodsItemsEditorProps {
    rows: GoodsRow[]
    onChange: (rows: GoodsRow[]) => void
    products: Product[]
    // When set, that supplier's products are listed first
    supplierId?: string
    // Label of the total shown under the lines
    totalLabel: string
}

// Lines of goods used by purchase orders and by capital given as goods
export function GoodsItemsEditor({ rows, onChange, products, supplierId, totalLabel }: GoodsItemsEditorProps) {
    const { t } = useTranslation()
    const { currencySymbol } = companyService.getSettings()

    const { supplierProducts, otherProducts } = useMemo(() => ({
        supplierProducts: products.filter(p => supplierId && String(p.supplier_id) === supplierId),
        otherProducts: products.filter(p => !supplierId || String(p.supplier_id) !== supplierId)
    }), [products, supplierId])

    const updateRow = (key: number, patch: Partial<GoodsRow>) => onChange(rows.map(row => row.key === key ? { ...row, ...patch } : row))

    // Picking a product fills in its current cost
    const selectProduct = (key: number, productId: string) => {
        const product = products.find(p => String(p.id) === productId)
        const row = rows.find(r => r.key === key)
        updateRow(key, { productId, unitCost: row?.unitCost || (product?.cost ? String(product.cost) : '') })
    }

    const inputClass = "w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"

    return (
        <div>
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('purForm.items')}</span>
            <div className="space-y-2">
                <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_6rem_8rem_7rem_2.5rem] gap-2 px-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    <span>{t('purForm.product')}</span>
                    <span>{t('purForm.quantity')}</span>
                    <span>{t('purForm.unitCost')}</span>
                    <span className="text-right">{t('purForm.subtotal')}</span>
                    <span />
                </div>
                {rows.map(row => (
                    <div key={row.key} className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_6rem_8rem_7rem_2.5rem] gap-2 items-center p-2 sm:p-0 rounded-xl border sm:border-0 border-gray-200 dark:border-gray-700">
                        <select
                            required
                            aria-label={t('purForm.product')}
                            value={row.productId}
                            onChange={(e) => selectProduct(row.key, e.target.value)}
                            className={cn(inputClass, "col-span-2 sm:col-span-1")}
                        >
                            <option value="" disabled>{t('purForm.selectProduct')}</option>
                            {supplierProducts.length > 0 && (
                                <optgroup label={t('purForm.supplierProducts')}>
                                    {supplierProducts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                                </optgroup>
                            )}
                            <optgroup label={supplierProducts.length > 0 ? t('purForm.otherProducts') : t('purForm.product')}>
                                {otherProducts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                            </optgroup>
                        </select>
                        <input
                            type="number"
                            min="0.001"
                            step="any"
                            inputMode="decimal"
                            required
                            aria-label={t('purForm.quantity')}
                            value={row.quantity}
                            onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                            className={inputClass}
                        />
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                aria-label={t('purForm.unitCost')}
                                value={row.unitCost}
                                onChange={(e) => updateRow(row.key, { unitCost: e.target.value })}
                                placeholder="0.00"
                                className={cn(inputClass, "pl-7")}
                            />
                        </div>
                        <span className="text-right text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            {formatCurrency((Number(row.quantity) || 0) * (Number(row.unitCost) || 0))}
                        </span>
                        <button
                            type="button"
                            onClick={() => onChange(rows.filter(r => r.key !== row.key))}
                            disabled={rows.length === 1}
                            title={t('purForm.removeItem')}
                            aria-label={t('purForm.removeItem')}
                            className="justify-self-end p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-between gap-4 mt-3">
                <button
                    type="button"
                    onClick={() => onChange([...rows, emptyGoodsRow()])}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('purForm.addItem')}
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {totalLabel}: <span className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(goodsTotal(rows))}</span>
                </p>
            </div>
        </div>
    )
}
