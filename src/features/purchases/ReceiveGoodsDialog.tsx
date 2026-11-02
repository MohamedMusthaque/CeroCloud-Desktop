import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { Loader2, PackageCheck, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { ModalHeader } from '@/components/ui/ModalHeader'
import { cn, formatCurrency } from '@/lib/utils'
import { PAYMENT_METHODS } from '@/lib/paymentMethods'
import { purchaseService, supplierAccountService } from '@/services/purchaseService'
import { companyService } from '@/services/companyService'
import type { Purchase, SupplierAccount } from '@/types/database'
import { purchaseErrorMessage } from './purchaseErrors'
import { roundMoney, settlementFor } from './purchaseUi'

interface ReceiveGoodsDialogProps {
    purchaseId: number | null
    onClose: () => void
    onReceived: () => void
}

interface ItemDraft {
    id: number
    name: string
    code?: string
    ordered: number
    received: string
    unitCost: string
}

// Leftover handling: pay/refund now, or leave it on the supplier account
type SettleChoice = 'now' | 'later'

export function ReceiveGoodsDialog({ purchaseId, onClose, onReceived }: ReceiveGoodsDialogProps) {
    const { t } = useTranslation()
    const [order, setOrder] = useState<Purchase | null>(null)
    const [account, setAccount] = useState<SupplierAccount | null>(null)
    const [receivedDate, setReceivedDate] = useState('')
    const [items, setItems] = useState<ItemDraft[]>([])
    const [updateCosts, setUpdateCosts] = useState(true)
    const [choice, setChoice] = useState<SettleChoice>('now')
    const [amount, setAmount] = useState('')
    const [method, setMethod] = useState<string>('cash')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setOrder(null)
        if (!purchaseId) return
        let stale = false
        purchaseService.getById(purchaseId).then(async (loaded) => {
            if (stale || !loaded) return
            const supplierAccount = await supplierAccountService.get(loaded.supplier_id)
            if (stale) return
            setOrder(loaded)
            setAccount(supplierAccount)
            setReceivedDate(format(new Date(), 'yyyy-MM-dd'))
            setItems((loaded.items ?? []).map(item => ({
                id: item.id!,
                name: item.product_name ?? '',
                code: item.product_code,
                ordered: item.ordered_quantity,
                received: String(item.ordered_quantity),
                unitCost: String(item.unit_cost)
            })))
            setUpdateCosts(true)
            setChoice('now')
            setAmount('')
            setMethod('cash')
        }).catch(error => toast.error(purchaseErrorMessage(error, t)))
        return () => { stale = true }
    }, [purchaseId, t])

    const goodsValue = roundMoney(items.reduce((sum, item) => sum + (Number(item.received) || 0) * (Number(item.unitCost) || 0), 0))
    const settlement = settlementFor(order?.paid ?? 0, account, goodsValue)
    const due = Math.max(-settlement.result, 0)
    const excess = Math.max(settlement.result, 0)

    // Prefill the settlement amount with what's due or overpaid; follows the goods value until edited
    const [amountEdited, setAmountEdited] = useState(false)
    useEffect(() => {
        if (!amountEdited) setAmount(settlement.result === 0 ? '' : String(Math.abs(settlement.result)))
    }, [settlement.result, amountEdited])
    useEffect(() => { setAmountEdited(false) }, [purchaseId])

    const updateItem = (id: number, patch: Partial<ItemDraft>) => setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!order?.id) return
        setSaving(true)
        try {
            const settleNow = settlement.result !== 0 && choice === 'now'
            await purchaseService.receive(order.id, {
                received_date: receivedDate,
                items: items.map(item => ({ id: item.id, received_quantity: Number(item.received), unit_cost: Number(item.unitCost) || 0 })),
                update_costs: updateCosts,
                settlement: settleNow
                    ? { type: settlement.result < 0 ? 'payment' : 'refund', amount: Number(amount), payment_method: method, payment_date: receivedDate }
                    : null
            })
            toast.success(t('purRecv.success'))
            onReceived()
            onClose()
        } catch (error) {
            toast.error(purchaseErrorMessage(error, t))
        } finally {
            setSaving(false)
        }
    }

    const { currencySymbol } = companyService.getSettings()
    const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
    const inputClass = "w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"

    const choiceButton = (value: SettleChoice, label: string) => (
        <label className={cn(
            "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-colors",
            choice === value ? "border-primary bg-primary/5 text-gray-900 dark:text-white" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
        )}>
            <input type="radio" name="settle-choice" checked={choice === value} onChange={() => setChoice(value)} className="text-primary focus:ring-primary" />
            {label}
        </label>
    )

    return createPortal(
        <AnimatePresence>
            {purchaseId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
                    >
                        <ModalHeader title={t('purRecv.title', { id: purchaseId })} onClose={onClose} className="sticky top-0 z-10" />

                        {!order ? (
                            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <span className={labelClass}>{t('purForm.supplier')}</span>
                                        <p className="py-2 font-bold text-gray-900 dark:text-white">{order.supplier_name}</p>
                                    </div>
                                    <div>
                                        <label htmlFor="receive-date" className={labelClass}>{t('purRecv.date')}</label>
                                        <input id="receive-date" type="date" required value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className={inputClass} />
                                    </div>
                                </div>

                                {/* Items: adjust for short deliveries or a different price */}
                                <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            <tr>
                                                <th className="px-3 py-2">{t('purForm.product')}</th>
                                                <th className="px-3 py-2 text-right">{t('purRecv.ordered')}</th>
                                                <th className="px-3 py-2">{t('purRecv.received')}</th>
                                                <th className="px-3 py-2">{t('purForm.unitCost')}</th>
                                                <th className="px-3 py-2 text-right">{t('purForm.subtotal')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                            {items.map(item => (
                                                <tr key={item.id}>
                                                    <td className="px-3 py-2">
                                                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                                                        {item.code && <p className="text-xs text-gray-500 font-mono">{item.code}</p>}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">{item.ordered}</td>
                                                    <td className="px-3 py-2 w-28">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            required
                                                            aria-label={t('purRecv.received')}
                                                            value={item.received}
                                                            onChange={(e) => updateItem(item.id, { received: e.target.value })}
                                                            className={inputClass}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 w-36">
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                required
                                                                aria-label={t('purForm.unitCost')}
                                                                value={item.unitCost}
                                                                onChange={(e) => updateItem(item.id, { unitCost: e.target.value })}
                                                                className={cn(inputClass, "pl-7")}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                                        {formatCurrency((Number(item.received) || 0) * (Number(item.unitCost) || 0))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer w-fit">
                                    <input
                                        type="checkbox"
                                        checked={updateCosts}
                                        onChange={(e) => setUpdateCosts(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-200">{t('purRecv.updateCosts')}</span>
                                </label>

                                {/* Settlement */}
                                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-4 space-y-2 text-sm">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('purRecv.summary')}</p>
                                    <SummaryRow label={t('purRecv.goodsValue')} value={formatCurrency(goodsValue)} />
                                    <SummaryRow label={t('purRecv.advancePaid')} value={`- ${formatCurrency(settlement.advance)}`} />
                                    {settlement.credit > 0 && <SummaryRow label={t('purRecv.earlierCredit')} value={`- ${formatCurrency(settlement.credit)}`} />}
                                    <div className={cn(
                                        "flex items-center justify-between gap-3 pt-3 mt-1 border-t border-gray-200 dark:border-gray-700 font-bold",
                                        settlement.result === 0 ? "text-green-600 dark:text-green-400" : settlement.result < 0 ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
                                    )}>
                                        <span className="flex items-center gap-2">
                                            {settlement.result === 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                            {settlement.result === 0 ? t('purRecv.settled') : settlement.result < 0 ? t('purRecv.toPay') : t('purRecv.overpaid')}
                                        </span>
                                        {settlement.result !== 0 && <span className="text-xl font-black">{formatCurrency(Math.abs(settlement.result))}</span>}
                                    </div>
                                    {settlement.owedBefore > 0 && (
                                        <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                            <Info className="w-3.5 h-3.5 shrink-0" />
                                            {t('purRecv.owedBefore', { amount: formatCurrency(settlement.owedBefore) })}
                                        </p>
                                    )}
                                </div>

                                {settlement.result !== 0 && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {due > 0
                                                ? <>{choiceButton('now', t('purRecv.payNow'))}{choiceButton('later', t('purRecv.payLater'))}</>
                                                : <>{choiceButton('now', t('purRecv.refundNow'))}{choiceButton('later', t('purRecv.keepAdvance'))}</>}
                                        </div>
                                        {choice === 'now' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="receive-amount" className={labelClass}>{t('purRecv.amount')}</label>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
                                                        <input
                                                            id="receive-amount"
                                                            type="number"
                                                            min="0.01"
                                                            step="0.01"
                                                            // A refund can't be more than what was overpaid
                                                            max={excess > 0 ? excess : undefined}
                                                            required
                                                            value={amount}
                                                            onChange={(e) => { setAmount(e.target.value); setAmountEdited(true) }}
                                                            className={cn(inputClass, "pl-7")}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label htmlFor="receive-method" className={labelClass}>{t('purForm.paymentMethod')}</label>
                                                    <select id="receive-method" value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                                                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{paymentMethodLabel(m)}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-5 py-2.5 text-sm font-bold bg-primary text-white hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center gap-2"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                                        {t('purRecv.confirm')}
                                    </button>
                                </div>
                            </form>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3 text-gray-600 dark:text-gray-300">
            <span>{label}</span>
            <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">{value}</span>
        </div>
    )
}
