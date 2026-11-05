import { forwardRef } from 'react'
import { format, parseISO } from 'date-fns'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import type { CapitalEntry, CompanySettings, Supplier } from '@/types/database'
import { billKindOf, billNumber, isPayableBill, outstandingOf, sourceOf, typeLabel } from '@/features/capital/capitalUi'
import { formatCurrency } from '@/lib/utils'

interface CapitalBillTemplateProps {
    entry: CapitalEntry
    settings: CompanySettings
    // Goods on credit: the supplier's details
    supplier?: Supplier
}

// Bill for anything taken or given on credit: laid out like the invoice and GRN, same paper size and banners
export const CapitalBillTemplate = forwardRef<HTMLDivElement, CapitalBillTemplateProps>(({ entry, settings, supplier }, ref) => {
    const { t, dateLocale } = useTranslation()
    const isTicket = settings.invoice?.paperSize === 'ticket80mm'
    const money = (amount: number) => formatCurrency(amount, settings.currencySymbol)

    const kind = billKindOf(entry)
    const payable = isPayableBill(kind)
    const number = billNumber(entry)
    const party = sourceOf(entry) || '-'
    const settled = entry.settled ?? 0
    const balance = outstandingOf(entry)
    const status = balance <= 0 ? 'paid' : settled > 0 ? 'partial' : 'unpaid'
    const statusTone = status === 'paid' ? 'text-green-600' : status === 'partial' ? 'text-amber-600' : 'text-red-600'
    const payments = entry.settlements ?? []
    const recordedAt = entry.created_at ? new Date(entry.created_at) : parseISO(entry.entry_date)
    const entryDay = parseISO(entry.entry_date)

    // Goods list their items; money is one line
    const lines = entry.items?.length
        ? entry.items.map(item => ({ name: item.product_name ?? '', code: item.product_code, quantity: item.quantity, unit: item.unit_cost, total: item.quantity * item.unit_cost }))
        : [{ name: entry.description || typeLabel(entry.type, t), code: undefined, quantity: 1, unit: entry.amount, total: entry.amount }]
    // The description already titles a money line; for goods it's a note under the items
    const notes = entry.items?.length ? entry.description : undefined

    // --- TICKET 80MM LAYOUT ---
    if (isTicket) {
        return (
            <div ref={ref} className="w-[280px] bg-white p-2 text-gray-900 font-mono text-[11px] leading-tight mx-auto" id="capital-bill-template">
                {settings.invoice?.headerImage && (
                    <img src={settings.invoice.headerImage} alt="Header" className="block max-w-full max-h-16 mx-auto mb-2 object-contain" />
                )}

                <div className="text-center mb-3 break-words">
                    {settings.logo && !settings.invoice?.headerImage && (
                        <img src={settings.logo} alt="Logo" className="w-12 h-12 mx-auto mb-1 object-contain" />
                    )}
                    <h1 className="font-bold text-sm uppercase mb-1">{settings.name}</h1>
                    <p>{settings.address}</p>
                    <p>{[settings.phone, settings.email].filter(Boolean).join(' - ')}</p>
                    {settings.taxId && <p className="font-bold mt-1">{t('print.nit', { id: settings.taxId })}</p>}
                </div>

                <div className="border-b border-black border-dashed my-2" />

                <p className="text-center font-bold text-sm uppercase">{t('print.capBill.title')}</p>
                <p className="text-center mb-2">{t(`print.capBill.kind.${kind}`)}</p>

                <div className="mb-2">
                    <p className="font-bold text-sm">{t('print.capBill.billNo', { id: number })}</p>
                    <p>{format(entryDay, 'dd/MM/yyyy', { locale: dateLocale })}</p>
                    {entry.created_by && <p>{t('print.capBill.recordedBy', { user: entry.created_by })}</p>}
                    <p className="font-bold mt-1">*** {t(`print.capBill.status.${status}`)} ***</p>
                </div>

                <div className="mb-2 break-words">
                    <p className="font-bold uppercase">{t(`print.capBill.party.${kind}`)}</p>
                    <p className="text-sm font-bold">{party}</p>
                    {supplier?.phone && <p>{supplier.phone}</p>}
                    {supplier?.address && <p>{supplier.address}</p>}
                </div>

                <div className="border-b border-black border-dashed my-2" />

                <table className="w-full mb-2 table-fixed">
                    <thead>
                        <tr className="text-left border-b border-black border-dashed">
                            <th className="w-[55%] pb-1">{t('print.desc')}</th>
                            <th className="w-[15%] pb-1 text-center">{t('print.qty')}</th>
                            <th className="w-[30%] pb-1 text-right">{t('print.total')}</th>
                        </tr>
                    </thead>
                    <tbody className="align-top">
                        {lines.map((line, i) => (
                            <tr key={i}>
                                <td className="py-1 pr-1">
                                    <div className="font-bold break-words">{line.name}</div>
                                    {entry.items?.length ? <div className="opacity-70">@ {money(line.unit)}</div> : null}
                                </td>
                                <td className="py-1 text-center">{line.quantity}</td>
                                <td className="py-1 text-right whitespace-nowrap">{money(line.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="border-t border-black border-dashed my-2 pt-2 space-y-1">
                    <div className="flex justify-between font-bold text-sm">
                        <span>{t('print.totalUpper')}</span>
                        <span>{money(entry.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>{t(payable ? 'print.capBill.paidSoFar' : 'print.capBill.receivedSoFar')}</span>
                        <span>{money(settled)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm">
                        <span>{t('print.capBill.balanceDue')}</span>
                        <span>{money(balance)}</span>
                    </div>
                </div>

                {payments.length > 0 && (
                    <div className="border-t border-black border-dashed my-2 pt-2">
                        <p className="font-bold uppercase mb-1">{t('print.capBill.payments')}</p>
                        {payments.map((payment, i) => (
                            <div key={i} className="flex justify-between">
                                <span>{format(parseISO(payment.settlement_date), 'dd/MM/yyyy', { locale: dateLocale })} · {paymentMethodLabel(payment.payment_method)}</span>
                                <span>{money(payment.amount)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {notes && <p className="mt-2 break-words">{notes}</p>}

                <div className="mt-8 space-y-6">
                    <div className="border-t border-black pt-1 text-center">{t('print.capBill.issuedSign')}</div>
                    <div className="border-t border-black pt-1 text-center">{t(`print.capBill.sign.${kind}`)}</div>
                </div>

                <div className="text-center mt-4 mb-2 break-words px-2">
                    <p className="italic">{t('print.capBill.footer')}</p>
                    <p className="mt-2 text-[9px] opacity-60">-- NexoraCloud --</p>
                </div>

                {settings.invoice?.footerImage && (
                    <img src={settings.invoice.footerImage} alt="Footer" className="w-full mt-2 object-contain" />
                )}
            </div>
        )
    }

    // --- A4 LAYOUT ---
    return (
        <div ref={ref} className="w-[800px] min-h-[1100px] bg-white p-0 text-gray-900 relative" id="capital-bill-template">
            {settings.invoice?.headerImage && (
                <div className="w-full h-24 overflow-hidden mb-8 px-12 pt-6">
                    <img src={settings.invoice.headerImage} alt="Header" className="w-full h-full object-contain" />
                </div>
            )}

            <div className={`px-12 ${!settings.invoice?.headerImage ? 'pt-12' : ''}`}>
                {/* Company and bill number */}
                <div className="flex justify-between items-start mb-12">
                    <div className="flex gap-4 items-center">
                        {!settings.invoice?.headerImage && settings.logo && (
                            <img src={settings.logo} alt="Logo" className="w-24 h-24 object-contain" />
                        )}
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">{settings.name || t('print.company')}</h1>
                            <div className="text-gray-500 text-sm mt-2 space-y-0.5">
                                {settings.address && <p>{settings.address}</p>}
                                {(settings.phone || settings.email) && <p>{[settings.phone, settings.email].filter(Boolean).join(' · ')}</p>}
                                {settings.taxId && <p className="font-medium text-primary">{t('print.rfc', { id: settings.taxId })}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="text-right">
                        <h2 className="text-xl font-bold text-gray-400 uppercase tracking-widest mb-1">{t('print.capBill.title')}</h2>
                        <p className="text-4xl font-mono font-bold text-gray-900">#{number}</p>
                        <p className="text-gray-500 mt-2 font-medium">
                            {t('print.date', { date: format(entryDay, t('print.longDateFormat'), { locale: dateLocale }) })}
                        </p>
                        <p className="text-gray-400 text-xs">
                            {format(recordedAt, `${t('print.longDateFormat')} HH:mm`, { locale: dateLocale })}
                        </p>
                        <div className="mt-4 px-4 py-2 rounded-lg inline-block bg-gray-50">
                            <span className={`text-xs font-bold uppercase tracking-wider ${statusTone}`}>{t(`print.capBill.status.${status}`)}</span>
                        </div>
                    </div>
                </div>

                {/* Party and kind */}
                <div className="bg-gray-50 rounded-xl p-6 mb-12 flex justify-between gap-6">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{t(`print.capBill.party.${kind}`)}</h3>
                        <p className="text-lg font-bold text-gray-900">{party}</p>
                        {supplier && (
                            <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                                {supplier.contact && <p>{supplier.contact}</p>}
                                {supplier.address && <p>{supplier.address}</p>}
                                {supplier.phone && <p>{t('print.phone', { phone: supplier.phone })}</p>}
                                {supplier.email && <p>{supplier.email}</p>}
                            </div>
                        )}
                    </div>
                    <div className="text-right">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{t(payable ? 'print.capBill.payable' : 'print.capBill.receivable')}</h3>
                        <p className="text-lg font-bold text-gray-900">{t(`print.capBill.kind.${kind}`)}</p>
                        <p className="text-sm text-gray-600 mt-1">{typeLabel(entry.type, t)}</p>
                        {entry.created_by && <p className="text-sm text-gray-600">{t('print.capBill.recordedBy', { user: entry.created_by })}</p>}
                    </div>
                </div>

                {/* Lines */}
                <div className="mb-12">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-100">
                                <th className="py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-400 w-[50%]">{t('print.description')}</th>
                                <th className="py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-400">{t('print.qtyShort')}</th>
                                <th className="py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-400">{t('print.capBill.unit')}</th>
                                <th className="py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-400">{t('print.total')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {lines.map((line, index) => (
                                <tr key={index}>
                                    <td className="py-4">
                                        <p className="font-bold text-gray-900">{line.name}</p>
                                        {line.code && <p className="text-xs text-gray-400">{t('print.code', { code: line.code })}</p>}
                                    </td>
                                    <td className="py-4 text-center font-medium text-gray-600">{line.quantity}</td>
                                    <td className="py-4 text-right font-medium text-gray-600">{money(line.unit)}</td>
                                    <td className="py-4 text-right font-bold text-gray-900">{money(line.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-12">
                    <div className="w-2/5">
                        <div className="flex justify-between py-2 text-gray-700 font-bold border-b border-gray-100">
                            <span>{t('print.total')}</span>
                            <span>{money(entry.amount)}</span>
                        </div>
                        <div className="flex justify-between py-2 text-gray-500 border-b border-gray-100">
                            <span>{t(payable ? 'print.capBill.paidSoFar' : 'print.capBill.receivedSoFar')}</span>
                            <span>{money(settled)}</span>
                        </div>
                        <div className="flex justify-between py-4 text-2xl font-black text-gray-900">
                            <span>{t('print.capBill.balanceDue')}</span>
                            <span>{money(balance)}</span>
                        </div>
                    </div>
                </div>

                {/* Payments so far */}
                {payments.length > 0 && (
                    <div className="mb-12">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{t('print.capBill.payments')}</h3>
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-gray-50">
                                {payments.map((payment, index) => (
                                    <tr key={index}>
                                        <td className="py-2 text-gray-600">{format(parseISO(payment.settlement_date), t('print.longDateFormat'), { locale: dateLocale })}</td>
                                        <td className="py-2 text-gray-600">{paymentMethodLabel(payment.payment_method)}</td>
                                        <td className="py-2 text-gray-500">{payment.notes}</td>
                                        <td className="py-2 text-right font-bold text-gray-900">{money(payment.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {notes && (
                    <div className="mb-12 text-sm text-gray-600 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap">{notes}</div>
                )}

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-16 mb-16 mt-16">
                    <div className="border-t-2 border-gray-300 pt-2 text-center text-sm font-medium text-gray-500">{t('print.capBill.issuedSign')}</div>
                    <div className="border-t-2 border-gray-300 pt-2 text-center text-sm font-medium text-gray-500">{t(`print.capBill.sign.${kind}`)}</div>
                </div>

                <div className="text-center text-gray-400 text-sm border-t border-gray-100 pt-8 pb-12">
                    <p className="mb-2">{t('print.capBill.footer')}</p>
                    <p className="text-xs">{t('print.generatedBy')}</p>
                </div>
            </div>

            {settings.invoice?.footerImage && (
                <div className="w-full absolute bottom-0 left-0">
                    <img src={settings.invoice.footerImage} alt="Footer" className="w-full object-contain" />
                </div>
            )}
        </div>
    )
})

CapitalBillTemplate.displayName = 'CapitalBillTemplate'
