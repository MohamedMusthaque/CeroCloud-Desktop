import { forwardRef } from 'react'
import { format, parseISO } from 'date-fns'
import { useTranslation, paymentMethodLabel } from '@/i18n'
import type { Client, CompanySettings, GoodsReceipt, Supplier } from '@/types/database'
import { grnId } from '@/features/purchases/purchaseUi'
import { formatCurrency } from '@/lib/utils'

interface GoodsReceiptTemplateProps {
    receipt: GoodsReceipt
    settings: CompanySettings
    // Registered seller's details, when the GRN is for a client or a supplier
    client?: Client
    supplier?: Supplier
}

// Goods Received Note: laid out like the bill (InvoiceTemplate), same paper size, logo and banners
export const GoodsReceiptTemplate = forwardRef<HTMLDivElement, GoodsReceiptTemplateProps>(({ receipt, settings, client, supplier }, ref) => {
    const { t, dateLocale } = useTranslation()
    const isTicket = settings.invoice?.paperSize === 'ticket80mm'
    const items = receipt.items ?? []
    const cancelled = receipt.status === 'cancelled'
    const money = (amount: number) => `${formatCurrency(amount, settings.currencySymbol)}`

    // Recorded at (date and time, like the bill); the goods may have arrived on another day
    const recordedAt = receipt.created_at ? new Date(receipt.created_at) : parseISO(receipt.receipt_date)
    const receivedDay = parseISO(receipt.receipt_date)
    const receivedOtherDay = format(recordedAt, 'yyyy-MM-dd') !== receipt.receipt_date
    const number = t('print.grnNumber', { id: grnId(receipt.id) })
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)

    // --- TICKET 80MM LAYOUT ---
    if (isTicket) {
        return (
            <div ref={ref} className="w-[280px] bg-white p-2 text-gray-900 font-mono text-[11px] leading-tight mx-auto" id="grn-template">
                {/* Top banner */}
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

                <p className="text-center font-bold text-sm uppercase mb-2">{t('print.grnTitle')}</p>

                <div className="mb-2">
                    <p className="font-bold text-sm">{t('print.grnNo', { id: number })}</p>
                    <p>{format(recordedAt, 'dd/MM/yyyy HH:mm', { locale: dateLocale })}</p>
                    {receivedOtherDay && <p>{t('print.receivedOn', { date: format(receivedDay, 'dd/MM/yyyy', { locale: dateLocale }) })}</p>}
                    {receipt.created_by && <p>{t('print.receivedByUser', { user: receipt.created_by })}</p>}
                    {cancelled && <p className="font-bold text-sm mt-1">*** {t('print.cancelledUpper')} ***</p>}
                </div>

                <div className="mb-2 break-words">
                    <p className="font-bold uppercase">{t('print.receivedFrom')}</p>
                    <p className="text-sm font-bold">{receipt.client_name}</p>
                    {receipt.supplier_id ? <p>{t('print.col.supplier')}</p> : !receipt.client_id && <p>{t('print.walkInSeller')}</p>}
                    {client?.tax_id && <p>{t('print.nit', { id: client.tax_id })}</p>}
                    {supplier?.contact && <p>{supplier.contact}</p>}
                    {(client ?? supplier)?.address && <p>{(client ?? supplier)!.address}</p>}
                    {(client ?? supplier)?.phone && <p>{(client ?? supplier)!.phone}</p>}
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
                        {items.map((item, i) => (
                            <tr key={i}>
                                <td className="py-1 pr-1">
                                    <div className="font-bold break-words">{item.product_name}</div>
                                    <div className="opacity-70">@ {money(item.unit_cost)}</div>
                                </td>
                                <td className="py-1 text-center">{item.quantity}</td>
                                <td className="py-1 text-right whitespace-nowrap">{money(item.subtotal)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="border-t border-black border-dashed my-2 pt-2">
                    <div className="flex justify-between font-bold text-sm">
                        <span>{t('print.totalUpper')}</span>
                        <span>{money(receipt.total)}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                        <span>{t('print.paymentMethod')}</span>
                        <span className="font-bold">{paymentMethodLabel(receipt.payment_method)}</span>
                    </div>
                </div>

                {receipt.notes && <p className="mt-2 break-words">{receipt.notes}</p>}

                {/* Signatures */}
                <div className="mt-8 space-y-6">
                    <div className="border-t border-black pt-1 text-center">{t('print.sellerSign')}</div>
                    <div className="border-t border-black pt-1 text-center">{t('print.receivedBySign')}</div>
                </div>

                <div className="text-center mt-4 mb-2 break-words px-2">
                    <p className="italic">{t('print.grnFooter')}</p>
                    <p className="mt-2 text-[9px] opacity-60">-- NexoraCloud --</p>
                </div>

                {/* Bottom banner */}
                {settings.invoice?.footerImage && (
                    <img src={settings.invoice.footerImage} alt="Footer" className="w-full mt-2 object-contain" />
                )}
            </div>
        )
    }

    // --- A4 LAYOUT ---
    return (
        <div ref={ref} className="w-[800px] min-h-[1100px] bg-white p-0 text-gray-900 relative" id="grn-template">
            {/* Custom Header Banner */}
            {settings.invoice?.headerImage && (
                <div className="w-full h-24 overflow-hidden mb-8 px-12 pt-6">
                    <img src={settings.invoice.headerImage} alt="Header" className="w-full h-full object-contain" />
                </div>
            )}

            <div className={`px-12 ${!settings.invoice?.headerImage ? 'pt-12' : ''}`}>
                {/* Company and GRN number */}
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
                        <h2 className="text-xl font-bold text-gray-400 uppercase tracking-widest mb-1">{t('print.grnTitle')}</h2>
                        <p className="text-4xl font-mono font-bold text-gray-900">#{grnId(receipt.id)}</p>
                        <p className="text-gray-500 mt-2 font-medium">
                            {t('print.date', { date: format(recordedAt, `${t('print.longDateFormat')} HH:mm`, { locale: dateLocale }) })}
                        </p>
                        {receivedOtherDay && (
                            <p className="text-gray-500 text-sm">{t('print.receivedOn', { date: format(receivedDay, t('print.longDateFormat'), { locale: dateLocale }) })}</p>
                        )}
                        <div className={`mt-4 px-4 py-2 rounded-lg inline-block ${cancelled ? 'bg-red-50' : 'bg-gray-50'}`}>
                            <span className={`text-xs font-bold uppercase tracking-wider ${cancelled ? 'text-red-600' : 'text-green-600'}`}>
                                {cancelled ? t('print.cancelledUpper') : t('print.paid')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Seller and payment */}
                <div className="bg-gray-50 rounded-xl p-6 mb-12 flex justify-between gap-6">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{t('print.receivedFrom')}</h3>
                        <p className="text-lg font-bold text-gray-900">{receipt.client_name}</p>
                        {client ? (
                            <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                                {client.tax_id && <p>{t('print.nitRfc', { id: client.tax_id })}</p>}
                                {client.address && <p>{client.address}</p>}
                                {client.phone && <p>{t('print.phone', { phone: client.phone })}</p>}
                                {client.email && <p>{client.email}</p>}
                            </div>
                        ) : receipt.supplier_id ? (
                            <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                                <p className="text-gray-500">{t('print.col.supplier')}</p>
                                {supplier?.contact && <p>{supplier.contact}</p>}
                                {supplier?.address && <p>{supplier.address}</p>}
                                {supplier?.phone && <p>{t('print.phone', { phone: supplier.phone })}</p>}
                                {supplier?.email && <p>{supplier.email}</p>}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">{t('print.walkInSeller')}</p>
                        )}
                    </div>
                    <div className="text-right">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{t('print.paymentMethod')}</h3>
                        <p className="text-lg font-bold text-gray-900">{paymentMethodLabel(receipt.payment_method)}</p>
                        {receipt.created_by && <p className="text-sm text-gray-600 mt-1">{t('print.receivedByUser', { user: receipt.created_by })}</p>}
                    </div>
                </div>

                {/* Items */}
                <div className="mb-12">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-100">
                                <th className="py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-400 w-[50%]">{t('print.description')}</th>
                                <th className="py-4 text-center text-xs font-bold uppercase tracking-wider text-gray-400">{t('print.qtyShort')}</th>
                                <th className="py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-400">{t('print.unitCost')}</th>
                                <th className="py-4 text-right text-xs font-bold uppercase tracking-wider text-gray-400">{t('print.total')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {items.map((item, index) => (
                                <tr key={index}>
                                    <td className="py-4">
                                        <p className="font-bold text-gray-900">{item.product_name}</p>
                                        {item.product_code && <p className="text-xs text-gray-400">{t('print.code', { code: item.product_code })}</p>}
                                    </td>
                                    <td className="py-4 text-center font-medium text-gray-600">{item.quantity}</td>
                                    <td className="py-4 text-right font-medium text-gray-600">{money(item.unit_cost)}</td>
                                    <td className="py-4 text-right font-bold text-gray-900">{money(item.subtotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-12">
                    <div className="w-1/3">
                        <div className="flex justify-between py-2 text-gray-500 border-b border-gray-100 pb-4">
                            <span>{t('print.subtotal')}</span>
                            <span>{money(subtotal)}</span>
                        </div>
                        <div className="flex justify-between py-4 text-2xl font-black text-gray-900">
                            <span>{t('print.total')}</span>
                            <span>{money(receipt.total)}</span>
                        </div>
                    </div>
                </div>

                {receipt.notes && (
                    <div className="mb-12 text-sm text-gray-600 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap">{receipt.notes}</div>
                )}

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-16 mb-16 mt-16">
                    <div className="border-t-2 border-gray-300 pt-2 text-center text-sm font-medium text-gray-500">{t('print.sellerSign')}</div>
                    <div className="border-t-2 border-gray-300 pt-2 text-center text-sm font-medium text-gray-500">{t('print.receivedBySign')}</div>
                </div>

                {/* Footer */}
                <div className="text-center text-gray-400 text-sm border-t border-gray-100 pt-8 pb-12">
                    <p className="mb-2">{t('print.grnFooter')}</p>
                    <p className="text-xs">{t('print.generatedBy')}</p>
                </div>
            </div>

            {/* Custom Footer Banner */}
            {settings.invoice?.footerImage && (
                <div className="w-full absolute bottom-0 left-0">
                    <img src={settings.invoice.footerImage} alt="Footer" className="w-full object-contain" />
                </div>
            )}
        </div>
    )
})

GoodsReceiptTemplate.displayName = 'GoodsReceiptTemplate'
