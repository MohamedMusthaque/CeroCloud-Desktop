import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { t } from '@/i18n'
import { pdfGenerator } from '@/services/pdfGenerator'
import { companyService } from '@/services/companyService'
import { ZakatRulingsPage, ZakatStatementPage } from '@/components/print/ZakatReportTemplate'
import type { ZakatReport } from './zakatReportData'

const today = () => new Date().toISOString().split('T')[0]
const MONEY = '#,##0.00'

// Two A4 pages: the calculation, then the rulings applied and sign-off
export function downloadZakatPdf(report: ZakatReport) {
    const settings = companyService.getSettings()
    const pages = [
        <ZakatStatementPage key="statement" settings={settings} report={report} page={{ current: 1, total: 2 }} />,
        <ZakatRulingsPage key="rulings" settings={settings} report={report} page={{ current: 2, total: 2 }} />
    ]
    return toast.promise(pdfGenerator.generatePages(pages, `${t('zakat.report.file')}_${today()}.pdf`), {
        loading: t('rep.export.generating'), success: t('rep.export.success'), error: t('rep.export.error')
    })
}

type Cell = string | number | null

// Sheet with money format on the numbers of the given columns
function sheet(rows: Cell[][], widths: number[], moneyColumns: number[]) {
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = widths.map(wch => ({ wch }))
    rows.forEach((_, r) => moneyColumns.forEach(c => {
        const cell = ws[XLSX.utils.encode_cell({ r, c })]
        if (cell && cell.t === 'n') cell.z = MONEY
    }))
    return ws
}

// Workbook: the calculation, the money from the records, and the rulings applied
export function downloadZakatExcel(report: ZakatReport) {
    try {
        const company = companyService.getSettings()
        const { result } = report
        const book = XLSX.utils.book_new()

        // Sheet 1: the calculation
        const rows: Cell[][] = [
            [company.name],
            [t('zakat.report.title')],
            [t('acct.excel.generated', { date: new Date().toLocaleString() })],
            [report.period],
            [],
            [t('zakat.report.col.step'), t('zakat.report.col.item'), t('zakat.report.col.source'), t('zakat.report.col.counted'), t('zakat.report.col.amount')]
        ]
        for (const group of report.groups) {
            for (const item of group.items) {
                rows.push([
                    `${group.letter} · ${group.title}`,
                    item.note ? `${item.label} (${item.note})` : item.label,
                    t(item.source === 'records' ? 'zakat.report.fromRecords' : 'zakat.report.entered'),
                    item.counted ? t('zakat.report.yes') : t('zakat.report.no'),
                    item.amount
                ])
            }
            rows.push([`${group.letter} · ${group.title}`, t('zakat.report.subtotal'), '', '', group.negative ? -group.total : group.total])
            rows.push([])
        }
        rows.push(
            [t('zakat.totalAssets'), '', '', '', result.assets],
            [t('zakat.e.short'), '', '', '', -result.liabilities],
            [t('zakat.net'), '', '', '', result.net],
            [],
            [`F · ${t('zakat.nisabTitle')}`],
            [t('zakat.basis'), `${report.nisab.basis} (${t('zakat.grams', { grams: report.nisab.grams })})`],
            [t('zakat.report.price'), report.nisab.price],
            [t('zakat.nisabValue'), '', '', '', result.hasPrice ? result.nisab : null],
            [t('zakat.yearType'), report.year],
            [t('zakat.period.label'), report.hawl],
            [],
            [report.status],
            [t('zakat.due', { rate: report.rate }), '', '', '', result.due]
        )
        XLSX.utils.book_append_sheet(book, sheet(rows, [34, 46, 16, 10, 18], [4]), t('zakat.report.sheet.calculation').slice(0, 31))

        // Sheet 2: where the money figure comes from
        if (report.moneyFlow.length > 0) {
            const flow: Cell[][] = [
                [t('zakat.report.moneyFromRecords')],
                [],
                ...report.moneyFlow.map(row => [row.label, row.amount] as Cell[]),
                [],
                [t('zakat.auto.money'), result.groups.money]
            ]
            XLSX.utils.book_append_sheet(book, sheet(flow, [40, 18], [1]), t('zakat.report.sheet.money').slice(0, 31))
        }

        // Sheet 3: the rulings applied
        const rulings: Cell[][] = [
            [t('zakat.law.title')],
            [t('zakat.law.intro')],
            [t('zakat.law.formula')],
            [],
            ...report.rulings.map(ruling => [`${ruling.letter} · ${ruling.title}`, ruling.text] as Cell[]),
            [t('zakat.law.notZakatable'), t('zakat.law.notZakatableText')],
            [],
            [t('zakat.coverage.title'), report.coverage.join(' · ')],
            [t('zakat.disclaimer')]
        ]
        XLSX.utils.book_append_sheet(book, sheet(rulings, [34, 110], []), t('zakat.report.sheet.rulings').slice(0, 31))

        XLSX.writeFile(book, `${t('zakat.report.file')}_${today()}.xlsx`)
        toast.success(t('acct.excel.success'))
    } catch (error) {
        console.error('Error generating zakat Excel file:', error)
        toast.error(t('acct.excel.error'))
    }
}
