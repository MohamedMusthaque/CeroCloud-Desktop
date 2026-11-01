import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'
import { parseISO } from 'date-fns'
import { Wallet, Info, Shapes, CalendarDays, CreditCard, Receipt, Percent } from 'lucide-react'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import { cn, formatCurrency } from '@/lib/utils'
import { expenseService, expenseTypeService } from '@/services/expenseService'
import type { Expense, ExpenseType } from '@/types/database'
import {
    ViewHeader, ViewAvatar, ViewBadge, ViewSection, ViewFields, ViewField, ViewAudit, ViewStat,
    ViewTable, ViewLink, ViewLoading, ViewNotFound, viewCellClass
} from '@/components/view/ViewPage'
import { useRecord, parseId } from '@/components/view/useRecord'
import { ExpenseForm } from './ExpenseForm'

// Other expenses of the same type listed below the details
const RELATED_SHOWN = 10

interface ExpenseRecord {
    expense: Expense
    types: ExpenseType[]
    sameType: Expense[]
}

export function ExpenseView() {
    const { t, locale } = useTranslation()
    const expenseId = parseId(useParams().id)
    const [editing, setEditing] = useState(false)

    // Expenses are only listed as a whole; the list is already sorted newest first
    const load = useCallback(async (): Promise<ExpenseRecord | null> => {
        if (!expenseId) return null
        const [expenses, types] = await Promise.all([expenseService.getAll(), expenseTypeService.getAll()])
        const expense = expenses.find(e => e.id === expenseId)
        if (!expense) return null
        return { expense, types, sameType: expenses.filter(e => e.expense_type_id === expense.expense_type_id) }
    }, [expenseId])
    const { data, loading, reload } = useRecord(load)

    const backLabel = t('view.backTo', { page: t('nav.expenses') })
    if (loading) return <ViewLoading />
    if (!data) return <ViewNotFound backTo="/expenses" backLabel={backLabel} />

    const { expense, types, sameType } = data
    const formatDay = (day: string) => parseISO(day).toLocaleDateString(locale)
    const typeTotal = sameType.reduce((sum, e) => sum + e.amount, 0)
    const share = typeTotal > 0 ? (expense.amount / typeTotal) * 100 : 0
    const others = sameType.filter(e => e.id !== expense.id)

    return (
        <div className="space-y-6 pb-20 p-2">
            <ViewHeader
                backTo="/expenses"
                backLabel={backLabel}
                avatar={<ViewAvatar gradient="from-red-500 to-orange-500"><Wallet className="w-8 h-8" /></ViewAvatar>}
                title={formatCurrency(expense.amount)}
                subtitle={t('view.expense.subtitle', { type: expense.expense_type_name ?? '', date: formatDay(expense.expense_date) })}
                badges={<>
                    <ViewBadge tone="primary" icon={Shapes}>{expense.expense_type_name}</ViewBadge>
                    <ViewBadge icon={CreditCard}>{paymentMethodLabel(expense.payment_method)}</ViewBadge>
                </>}
                onEdit={() => setEditing(true)}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ViewStat label={t('expForm.amount')} value={formatCurrency(expense.amount)} icon={Wallet} color="bg-red-500" />
                <ViewStat label={t('view.expense.typeTotal')} value={formatCurrency(typeTotal)} hint={expense.expense_type_name} icon={Shapes} color="bg-blue-500" />
                <ViewStat label={t('view.expense.typeCount')} value={sameType.length} icon={Receipt} color="bg-purple-500" />
                <ViewStat label={t('view.expense.share')} value={`${share.toFixed(1)}%`} icon={Percent} color="bg-orange-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ViewSection title={t('view.details')} icon={Info} className="lg:col-span-2">
                    <ViewFields>
                        <ViewField label={t('expForm.type')} value={expense.expense_type_name} icon={Shapes} />
                        <ViewField label={t('expForm.amount')} value={formatCurrency(expense.amount)} icon={Wallet} />
                        <ViewField label={t('expForm.date')} value={formatDay(expense.expense_date)} icon={CalendarDays} />
                        <ViewField label={t('expForm.paymentMethod')} value={paymentMethodLabel(expense.payment_method)} icon={CreditCard} />
                        <ViewField label={t('view.description')} value={expense.description} wide />
                    </ViewFields>
                </ViewSection>
                <ViewAudit record={expense} />
            </div>

            <ViewSection
                title={t('view.expense.sameType', { type: expense.expense_type_name ?? '' })}
                icon={Receipt}
                actions={others.length > RELATED_SHOWN && <span className="text-xs text-gray-500">{t('view.showingLatest', { shown: RELATED_SHOWN, total: others.length })}</span>}
            >
                <ViewTable
                    columns={[
                        { label: t('exp.col.date') }, { label: t('exp.col.description') },
                        { label: t('exp.col.payment') }, { label: t('exp.col.amount'), align: 'right' }
                    ]}
                    empty={others.length === 0 ? t('view.expense.noOthers') : undefined}
                >
                    {others.slice(0, RELATED_SHOWN).map(other => (
                        <tr key={other.id}>
                            <td className={cn(viewCellClass, "whitespace-nowrap")}>
                                <ViewLink to={`/expenses/${other.id}`} page="expenses">{formatDay(other.expense_date)}</ViewLink>
                            </td>
                            <td className={cn(viewCellClass, "max-w-xs truncate")} title={other.description}>{other.description || '-'}</td>
                            <td className={cn(viewCellClass, "whitespace-nowrap")}>{paymentMethodLabel(other.payment_method)}</td>
                            <td className={cn(viewCellClass, "text-right font-bold text-gray-900 dark:text-white")}>{formatCurrency(other.amount)}</td>
                        </tr>
                    ))}
                </ViewTable>
            </ViewSection>

            <ExpenseForm
                isOpen={editing}
                expense={expense}
                types={types}
                onClose={() => setEditing(false)}
                onSaved={reload}
                onTypeCreated={reload}
            />
        </div>
    )
}
