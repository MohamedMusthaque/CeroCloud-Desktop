import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { Save, Loader2, ArrowDownToLine, ArrowUpFromLine, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { ModalHeader } from '@/components/ui/ModalHeader'
import { cn, formatCurrency } from '@/lib/utils'
import { PAYMENT_METHODS } from '@/lib/paymentMethods'
import { capitalService, type RepaymentKind } from '@/services/capitalService'
import { companyService } from '@/services/companyService'
import type { CapitalEntry } from '@/types/database'
import { allocateRepayment, capitalErrorMessage, dueBySource, outstandingOf, typeLabel } from './capitalUi'
import { AmountInput } from '@/components/ui/AmountInput'

const KINDS: { kind: RepaymentKind; icon: React.ElementType }[] = [
    { kind: 'credit', icon: ArrowDownToLine },
    { kind: 'loan', icon: ArrowUpFromLine },
    { kind: 'supplier', icon: Truck }
]

interface RepaymentFormProps {
    isOpen: boolean
    // Every capital entry; the form picks out what's outstanding
    entries: CapitalEntry[]
    // Tab and source chosen when the form opens
    defaultKind?: RepaymentKind
    defaultSourceId?: number | null
    onClose: () => void
    onSaved: () => void
}

// One repayment covering everything a source has outstanding, spread over its entries oldest first:
// credit a source pays back (money in), loans paid back to a lender, or goods on credit paid to the supplier (money out)
export function RepaymentForm({ isOpen, entries, defaultKind, defaultSourceId, onClose, onSaved }: RepaymentFormProps) {
    const { t, locale } = useTranslation()
    const [kind, setKind] = useState<RepaymentKind>('credit')
    const [sourceId, setSourceId] = useState('')
    const [amount, setAmount] = useState('')
    const [date, setDate] = useState('')
    const [method, setMethod] = useState<string>('cash')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    const duesByKind = useMemo(() => ({
        credit: dueBySource(entries, 'credit'),
        loan: dueBySource(entries, 'loan'),
        supplier: dueBySource(entries, 'supplier')
    }), [entries])
    const totalOf = (k: RepaymentKind) => Math.round(duesByKind[k].reduce((sum, d) => sum + d.outstanding, 0) * 100) / 100
    const dues = duesByKind[kind]
    const due = dues.find(d => String(d.sourceId) === sourceId)

    // Picks the source (the only one, if there's just one) and fills in what it has outstanding
    const selectKind = (next: RepaymentKind, preferredSourceId?: number | null) => {
        const list = duesByKind[next]
        const first = list.find(d => d.sourceId === preferredSourceId) ?? (list.length === 1 ? list[0] : undefined)
        setKind(next)
        setSourceId(first ? String(first.sourceId) : '')
        setAmount(first ? String(first.outstanding) : '')
    }

    useEffect(() => {
        if (!isOpen) return
        // Without a preference, open on the tab that has something outstanding
        const start = defaultKind ?? KINDS.find(({ kind: k }) => duesByKind[k].length > 0)?.kind ?? 'credit'
        selectKind(start, defaultSourceId)
        setDate(format(new Date(), 'yyyy-MM-dd'))
        setMethod('cash')
        setNotes('')
        // Only when the form opens: a reload behind it shouldn't reset what's typed
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, defaultKind, defaultSourceId])

    const chooseSource = (value: string) => {
        setSourceId(value)
        const chosen = dues.find(d => String(d.sourceId) === value)
        setAmount(chosen ? String(chosen.outstanding) : '')
    }

    const parts = useMemo(() => due ? allocateRepayment(due.entries, Number(amount) || 0) : new Map<number, number>(), [due, amount])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!due) return
        setSaving(true)
        try {
            await capitalService.repaySource({ kind, source_id: due.sourceId, amount: Number(amount), settlement_date: date, payment_method: method, notes })
            toast.success(t(`capRepay.saved.${kind}`, { name: due.name, amount: formatCurrency(Number(amount)) }))
            onSaved()
            onClose()
        } catch (error) {
            toast.error(capitalErrorMessage(error, t))
        } finally {
            setSaving(false)
        }
    }

    const { currencySymbol } = companyService.getSettings()
    const formatDay = (day: string) => parseISO(day).toLocaleDateString(locale)
    const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
    const inputClass = "w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
    const cellClass = "px-3 py-2 whitespace-nowrap"

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
                        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
                    >
                        <ModalHeader title={t('capRepay.title')} onClose={onClose} className="sticky top-0 z-10" />

                        <div className="px-6 pt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label={t('capRepay.title')}>
                                {KINDS.map(({ kind: option, icon: Icon }) => (
                                    <button
                                        key={option}
                                        type="button"
                                        role="radio"
                                        aria-checked={kind === option}
                                        onClick={() => selectKind(option)}
                                        className={cn(
                                            "flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl border text-left transition-colors",
                                            kind === option
                                                ? "border-primary bg-primary/10"
                                                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                        )}
                                    >
                                        <span className={cn("flex items-center gap-1.5 text-sm font-bold", kind === option ? "text-primary" : "text-gray-700 dark:text-gray-200")}>
                                            <Icon className="w-4 h-4" />
                                            {t(`capRepay.kind.${option}`)}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{t('capRepay.kindTotal', { amount: formatCurrency(totalOf(option)) })}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{t(`capRepay.kindHint.${kind}`)}</p>
                        </div>

                        {dues.length === 0 ? (
                            <div className="p-6 space-y-4">
                                <p className="text-sm text-gray-600 dark:text-gray-300">{t(`capRepay.nothingDue.${kind}`)}</p>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                                    >
                                        {t('common.close')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label htmlFor="repay-source" className={labelClass}>{t(`capRepay.source.${kind}`)}</label>
                                    <select id="repay-source" required value={sourceId} onChange={(e) => chooseSource(e.target.value)} className={inputClass}>
                                        <option value="" disabled>{t(`capRepay.selectSource.${kind}`)}</option>
                                        {dues.map(d => (
                                            <option key={d.sourceId} value={d.sourceId}>
                                                {t(`capRepay.sourceOption.${kind}`, { name: d.name, amount: formatCurrency(d.outstanding) })}
                                            </option>
                                        ))}
                                    </select>
                                    {due && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                            {due.entries.length === 1
                                                ? t(`capRepay.owesOne.${kind}`, { amount: formatCurrency(due.outstanding) })
                                                : t(`capRepay.owesMany.${kind}`, { amount: formatCurrency(due.outstanding), count: due.entries.length })}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="repay-amount" className={labelClass}>{t(`capRepay.amount.${kind}`)}</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
                                            <AmountInput
                                                id="repay-amount"
                                                min="0.01"
                                                max={due?.outstanding}
                                                required
                                                disabled={!due}
                                                value={amount}
                                                onChange={setAmount}
                                                className={`${inputClass} pl-8 disabled:opacity-50`}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="repay-date" className={labelClass}>{t('capSettle.date')}</label>
                                        <input id="repay-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="repay-method" className={labelClass}>{t('capSettle.method')}</label>
                                    <select id="repay-method" value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{paymentMethodLabel(m)}</option>)}
                                    </select>
                                </div>

                                {/* How the amount is split: oldest first */}
                                {due && (
                                    <div>
                                        <span className={labelClass}>{t('capRepay.allocation')}</span>
                                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 dark:bg-gray-900/50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    <tr>
                                                        <th className={cellClass}>{t('cap.col.date')}</th>
                                                        <th className={cellClass}>{t('cap.col.type')}</th>
                                                        <th className={cn(cellClass, "text-right")}>{t('capRepay.owed')}</th>
                                                        <th className={cn(cellClass, "text-right")}>{t('capRepay.thisPayment')}</th>
                                                        <th className={cn(cellClass, "text-right")}>{t('capRepay.leftAfter')}</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                                    {due.entries.map(entry => {
                                                        const part = parts.get(entry.id!) ?? 0
                                                        const left = Math.round((outstandingOf(entry) - part) * 100) / 100
                                                        return (
                                                            <tr key={entry.id} className={part > 0 ? "" : "text-gray-400 dark:text-gray-500"}>
                                                                <td className={cellClass}>{formatDay(entry.entry_date)}</td>
                                                                <td className={cellClass}>{typeLabel(entry.type, t)}</td>
                                                                <td className={cn(cellClass, "text-right tabular-nums")}>{formatCurrency(outstandingOf(entry))}</td>
                                                                <td className={cn(cellClass, "text-right tabular-nums font-bold", part > 0 && "text-green-600 dark:text-green-400")}>
                                                                    {part > 0 ? formatCurrency(part) : '-'}
                                                                </td>
                                                                <td className={cn(cellClass, "text-right tabular-nums")}>{formatCurrency(left)}</td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="repay-notes" className={labelClass}>{t('capSettle.notes')}</label>
                                    <textarea id="repay-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} resize-none`} />
                                </div>

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
                                        disabled={saving || !due}
                                        className="px-5 py-2.5 text-sm font-bold bg-primary text-white hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center gap-2"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        {t('capRepay.save')}
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
