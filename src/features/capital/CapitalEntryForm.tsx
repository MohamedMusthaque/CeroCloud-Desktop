import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { Save, Loader2, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { ModalHeader } from '@/components/ui/ModalHeader'
import { cn, formatCurrency } from '@/lib/utils'
import { PAYMENT_METHODS } from '@/lib/paymentMethods'
import { capitalService } from '@/services/capitalService'
import { companyService } from '@/services/companyService'
import { CAPITAL_ENTRY_TYPES, CAPITAL_FORMS, type CapitalEntry, type CapitalEntryType, type CapitalForm, type Product, type Supplier } from '@/types/database'
import { GoodsItemsEditor } from '@/features/purchases/GoodsItemsEditor'
import { emptyGoodsRow, goodsInput, goodsTotal, type GoodsRow } from '@/features/purchases/goodsRows'
import { FORM_ICONS, TYPE_STYLES, capitalErrorMessage, formLabel, isCapitalType, isGoodsForm, typeLabel } from './capitalUi'

interface CapitalEntryFormProps {
    isOpen: boolean
    entry: CapitalEntry | null
    // Type preselected for a new entry ("Add Capital", "Add Income" or "Record Withdrawal")
    defaultType?: CapitalEntryType
    products: Product[]
    suppliers: Supplier[]
    onClose: () => void
    onSaved: () => void
}

export function CapitalEntryForm({ isOpen, entry, defaultType = 'capital', products, suppliers, onClose, onSaved }: CapitalEntryFormProps) {
    const { t } = useTranslation()
    const [type, setType] = useState<CapitalEntryType>('capital')
    const [form, setForm] = useState<CapitalForm>('money')
    const [date, setDate] = useState('')
    const [amount, setAmount] = useState('')
    const [source, setSource] = useState('')
    const [supplierId, setSupplierId] = useState('')
    const [rows, setRows] = useState<GoodsRow[]>([])
    const [updateCosts, setUpdateCosts] = useState(true)
    const [method, setMethod] = useState<string>('cash')
    const [description, setDescription] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!isOpen) return
        setType(entry?.type ?? defaultType)
        setForm(entry?.form ?? 'money')
        setDate(entry?.entry_date ?? format(new Date(), 'yyyy-MM-dd'))
        setAmount(entry ? String(entry.amount) : '')
        setSource(entry?.source ?? '')
        setSupplierId(entry?.supplier_id ? String(entry.supplier_id) : '')
        setRows([emptyGoodsRow()])
        setUpdateCosts(true)
        setMethod(entry?.payment_method || 'cash')
        setDescription(entry?.description ?? '')
    }, [isOpen, entry, defaultType])

    const isEditing = !!entry?.id
    const isCapital = isCapitalType(type)
    // Income and withdrawals are always money
    const effectiveForm: CapitalForm = isCapital ? form : 'money'
    const isGoods = isGoodsForm(effectiveForm)
    const takesMethod = !isGoods && effectiveForm !== 'pledge'

    const suggestions = type === 'income'
        ? [t('cap.suggest.commission'), t('cap.suggest.rent'), t('cap.suggest.interest')]
        : type === 'withdrawal'
            ? [t('cap.suggest.personal')]
            : effectiveForm === 'loan' ? [t('cap.suggest.bankLoan')] : [t('cap.suggest.ownSavings'), t('cap.suggest.partner')]
    const sourceLabel = effectiveForm === 'loan' ? t('capForm.lender') : effectiveForm === 'pledge' ? t('capForm.promisedBy') : t('capForm.source')
    const sourcePlaceholder = effectiveForm === 'loan' ? t('capForm.lenderPlaceholder')
        : type === 'income' ? t('capForm.sourcePlaceholder.income')
            : type === 'withdrawal' ? t('capForm.sourcePlaceholder.withdrawal')
                : t('capForm.sourcePlaceholder.capital')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (isEditing) {
                await capitalService.update(entry!.id!, {
                    entry_date: date, source, description, payment_method: method,
                    ...(isGoods ? {} : { amount: Number(amount) })
                })
                toast.success(t('capForm.updated'))
            } else {
                await capitalService.create({
                    type, form: effectiveForm, entry_date: date, source, description,
                    payment_method: takesMethod ? method : '',
                    ...(isGoods
                        ? { items: goodsInput(rows), update_costs: updateCosts, supplier_id: effectiveForm === 'supplier_credit' ? Number(supplierId) : null }
                        : { amount: Number(amount) })
                })
                toast.success(t('capForm.created'))
            }
            onSaved()
            onClose()
        } catch (error) {
            toast.error(capitalErrorMessage(error, t))
        } finally {
            setSaving(false)
        }
    }

    const { currencySymbol } = companyService.getSettings()
    const title = isEditing ? t('capForm.editTitle')
        : defaultType === 'income' ? t('capForm.newIncomeTitle')
            : defaultType === 'withdrawal' ? t('capForm.newWithdrawalTitle')
                : t('capForm.newCapitalTitle')
    const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1"
    const inputClass = "w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
    const choiceClass = (selected: boolean) => cn(
        "flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-sm font-medium transition-colors text-center disabled:cursor-not-allowed",
        selected
            ? "border-primary bg-primary/10 text-primary"
            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 disabled:opacity-40 disabled:hover:bg-transparent"
    )

    return createPortal(
        <AnimatePresence>
            {isOpen && (
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
                        className={cn("relative w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl", isGoods && !isEditing ? "max-w-3xl" : "max-w-xl")}
                    >
                        <ModalHeader title={title} onClose={onClose} className="sticky top-0 z-10" />

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Type */}
                            <div>
                                <span className={labelClass}>{t('capForm.type')}</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label={t('capForm.type')}>
                                    {CAPITAL_ENTRY_TYPES.map(option => {
                                        const Icon = TYPE_STYLES[option].icon
                                        return (
                                            <button
                                                key={option}
                                                type="button"
                                                role="radio"
                                                aria-checked={type === option}
                                                disabled={isEditing && option !== type}
                                                onClick={() => setType(option)}
                                                title={t(`cap.typeHint.${option}`)}
                                                className={choiceClass(type === option)}
                                            >
                                                <Icon className="w-5 h-5" />
                                                {typeLabel(option, t)}
                                            </button>
                                        )
                                    })}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{t(`cap.typeHint.${type}`)}</p>
                            </div>

                            {/* Form of capital */}
                            {isCapital && (
                                <div>
                                    <span className={labelClass}>{t('capForm.form')}</span>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2" role="radiogroup" aria-label={t('capForm.form')}>
                                        {CAPITAL_FORMS.map(option => {
                                            const Icon = FORM_ICONS[option]
                                            return (
                                                <button
                                                    key={option}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={form === option}
                                                    disabled={isEditing && option !== form}
                                                    onClick={() => setForm(option)}
                                                    title={t(`cap.formHint.${option}`)}
                                                    className={choiceClass(form === option)}
                                                >
                                                    <Icon className="w-5 h-5" />
                                                    <span className="text-xs leading-tight">{formLabel(option, t)}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{t(`cap.formHint.${form}`)}</p>
                                </div>
                            )}

                            {isEditing && (isGoods || isCapital) && (
                                <p className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    {t('capForm.lockedNote')}
                                </p>
                            )}

                            {/* Supplier for goods on credit */}
                            {effectiveForm === 'supplier_credit' && !isEditing && (
                                <div>
                                    <label htmlFor="capital-supplier" className={labelClass}>{t('capForm.supplier')}</label>
                                    <select id="capital-supplier" required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputClass}>
                                        <option value="" disabled>{t('capForm.selectSupplier')}</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Goods */}
                            {isGoods && !isEditing && (
                                <>
                                    <GoodsItemsEditor rows={rows} onChange={setRows} products={products} supplierId={supplierId} totalLabel={t('capForm.goodsTotal')} />
                                    <label className="flex items-center gap-2 cursor-pointer w-fit">
                                        <input
                                            type="checkbox"
                                            checked={updateCosts}
                                            onChange={(e) => setUpdateCosts(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-200">{t('capForm.updateCosts')}</span>
                                    </label>
                                </>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="capital-date" className={labelClass}>{t('capForm.date')}</label>
                                    <input id="capital-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                                </div>
                                {isGoods ? (
                                    <div>
                                        <span className={labelClass}>{t('capForm.goodsTotal')}</span>
                                        <p className="py-2.5 text-lg font-black text-gray-900 dark:text-white">
                                            {formatCurrency(isEditing ? entry!.amount : goodsTotal(rows))}
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <label htmlFor="capital-amount" className={labelClass}>{t('capForm.amount')}</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
                                            <input
                                                id="capital-amount"
                                                type="number"
                                                inputMode="decimal"
                                                min="0.01"
                                                step="0.01"
                                                required
                                                autoFocus
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                placeholder="0.00"
                                                className={`${inputClass} pl-8`}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {effectiveForm !== 'supplier_credit' && (
                                    <div>
                                        <label htmlFor="capital-source" className={labelClass}>{sourceLabel}</label>
                                        <input
                                            id="capital-source"
                                            type="text"
                                            list="capital-source-suggestions"
                                            required={effectiveForm === 'loan'}
                                            value={source}
                                            onChange={(e) => setSource(e.target.value)}
                                            placeholder={sourcePlaceholder}
                                            className={inputClass}
                                        />
                                        <datalist id="capital-source-suggestions">
                                            {suggestions.map(s => <option key={s} value={s} />)}
                                        </datalist>
                                    </div>
                                )}
                                {takesMethod && (
                                    <div>
                                        <label htmlFor="capital-method" className={labelClass}>{t('capForm.paymentMethod')}</label>
                                        <select id="capital-method" value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass}>
                                            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{paymentMethodLabel(m)}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label htmlFor="capital-description" className={labelClass}>{t('capForm.description')}</label>
                                <textarea
                                    id="capital-description"
                                    rows={2}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className={`${inputClass} resize-none`}
                                />
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
                                    disabled={saving}
                                    className="px-5 py-2.5 text-sm font-bold bg-primary text-white hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25 disabled:opacity-50 transition-all flex items-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {t('capForm.save')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )
}
