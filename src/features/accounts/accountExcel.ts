import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { t, paymentMethodLabel } from '@/i18n'
import { fileStamp } from '@/lib/utils'
import { companyService } from '@/services/companyService'
import type { SummaryRow } from '@/components/print/AccountsReportTemplate'
import { BALANCE_MODES, accountName, balanceState, cashTotals, lineLabel, typeLabel, type Account, type AccountLine, type AccountType } from './accountLedger'

type Cell = string | number | Date | null
const MONEY = '#,##0.00'
const DAY = 'dd/mm/yyyy'

// 'YYYY-MM-DD' as a real date cell (local day)
const toDate = (day: string | null | undefined): Date | null => {
    if (!day) return null
    const [y, m, d] = day.split('-').map(Number)
    return y && m && d ? new Date(y, m - 1, d) : null
}

const balanceMeaning = (type: AccountType, value: number) => {
    const mode = BALANCE_MODES[type]
    return mode === 'party' && value === 0 ? t('acct.balance.settled') : t(balanceState(mode, value).key)
}

const cashLabel = (line: AccountLine) => line.cancelled ? t('acct.cancelled') : line.cash === 'in' ? t('acct.cash.in') : line.cash === 'out' ? t('acct.cash.out') : ''
const detailsOf = (line: AccountLine) => [line.details, line.itemCount ? t('acct.items', { count: line.itemCount }) : ''].filter(Boolean).join(' · ')

// Report title block above a table: company, title, when, and the filters in force
function heading(title: string, filters: string[]): Cell[][] {
    const settings = companyService.getSettings()
    return [
        [settings.name],
        [title],
        [t('acct.excel.generated', { date: new Date().toLocaleString() })],
        ...(filters.length > 0 ? [[t('acct.excel.filters', { filters: filters.join(' · ') })]] : []),
        []
    ]
}

// Sheet from rows, with money and date formats on the given columns, widths, and a filter on the table
function makeSheet(rows: Cell[][], headerRow: number, columns: { width: number; money?: boolean; date?: boolean }[], tableEnd: number) {
    const sheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true, dateNF: DAY })
    sheet['!cols'] = columns.map(column => ({ wch: column.width }))
    for (let r = headerRow + 1; r < rows.length; r++) {
        columns.forEach((column, c) => {
            const cell = sheet[XLSX.utils.encode_cell({ r, c })]
            if (!cell) return
            if (column.money && cell.t === 'n') cell.z = MONEY
            if (column.date && (cell.t === 'd' || cell.t === 'n')) cell.z = DAY
        })
    }
    if (tableEnd > headerRow) {
        sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: tableEnd, c: columns.length - 1 } }) }
    }
    return sheet
}

const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, '').trim() || 'account'
// Sheet names: up to 31 characters, none of : \ / ? * [ ]
const sheetName = (name: string) => name.replace(/[:\\/?*[\]]+/g, ' ').trim().slice(0, 31) || 'Sheet'

function save(build: () => XLSX.WorkBook, filename: string) {
    try {
        XLSX.writeFile(build(), filename, { cellDates: true })
        toast.success(t('acct.excel.success'))
    } catch (error) {
        console.error('Error generating Excel file:', error)
        toast.error(t('acct.excel.error'))
    }
}

// Columns shared by the transaction sheets
const LINE_HEADERS = () => [
    t('acct.col.date'), t('acct.col.transaction'), t('acct.col.reference'), t('acct.col.method'), t('acct.col.details'),
    t('acct.col.notes'), t('acct.col.recordedBy'), t('acct.col.cash'), t('acct.col.amount'), t('acct.excel.effect'),
    t('acct.col.balance'), t('acct.excel.balanceMeaning')
]
const LINE_COLUMNS = [
    { width: 12, date: true }, { width: 26 }, { width: 14 }, { width: 14 }, { width: 46 },
    { width: 32 }, { width: 16 }, { width: 14 }, { width: 14, money: true }, { width: 14, money: true },
    { width: 14, money: true }, { width: 16 }
]
const lineRow = (line: AccountLine, type: AccountType): Cell[] => [
    toDate(line.date), t(lineLabel(line.kind)), line.ref?.text ?? '', line.method ? paymentMethodLabel(line.method) : '',
    detailsOf(line), line.notes ?? '', line.by ?? '', cashLabel(line), line.amount,
    // Signed change to the balance; blank when the line doesn't move it
    line.effect !== 0 ? line.effect : null,
    line.effect !== 0 ? line.balance : null,
    line.effect !== 0 ? balanceMeaning(type, line.balance) : ''
]

export interface SummaryExcelInput {
    rows: SummaryRow[]
    filters: string[]
    balanceLabel: string
    // Dates on the list, to pick each account's transactions
    fromDate: string
    toDate: string
}

// The Accounts list as shown, plus every transaction of those accounts in the period
export function downloadAccountsExcel({ rows, filters, balanceLabel, fromDate, toDate: endDate }: SummaryExcelInput) {
    save(() => {
        const book = XLSX.utils.book_new()

        // Sheet 1: one row per account
        const top = heading(t('acct.report.summaryTitle'), filters)
        const header = [t('acct.col.account'), t('acct.col.type'), t('acct.excel.info'), t('acct.col.transactions'), t('acct.col.lastActivity'), balanceLabel, t('acct.excel.balanceMeaning')]
        const body: Cell[][] = rows.map(row => [
            accountName(row.account, t), t(typeLabel(row.account.type)), row.account.info ?? '', row.count,
            toDate(row.lastDate), row.balance, balanceMeaning(row.account.type, row.balance)
        ])
        const parties = rows.filter(row => BALANCE_MODES[row.account.type] === 'party')
        const owedToYou = parties.reduce((sum, row) => sum + Math.max(row.balance, 0), 0)
        const youOwe = parties.reduce((sum, row) => sum + Math.max(-row.balance, 0), 0)
        const footer: Cell[][] = [
            [],
            [t('acct.report.totals'), '', '', rows.reduce((sum, row) => sum + row.count, 0)],
            [t('acct.stat.owedToYou'), '', '', '', '', owedToYou],
            [t('acct.stat.youOwe'), '', '', '', '', youOwe]
        ]
        const sheetRows = [...top, header, ...body, ...footer]
        XLSX.utils.book_append_sheet(book, makeSheet(sheetRows, top.length, [
            { width: 32 }, { width: 18 }, { width: 30 }, { width: 14 }, { width: 14, date: true }, { width: 18, money: true }, { width: 16 }
        ], top.length + body.length), sheetName(t('acct.excel.accountsSheet')))

        // Sheet 2: every transaction of the listed accounts within the dates
        const lineTop = heading(t('acct.excel.transactionsSheet'), filters)
        const lineHeader = [t('acct.col.account'), t('acct.col.type'), ...LINE_HEADERS()]
        const lineBody: Cell[][] = []
        for (const row of rows) {
            for (const line of row.account.lines) {
                if ((fromDate && line.date < fromDate) || (endDate && line.date > endDate)) continue
                lineBody.push([accountName(row.account, t), t(typeLabel(row.account.type)), ...lineRow(line, row.account.type)])
            }
        }
        // Oldest first by date (each account's own order is kept within a day)
        lineBody.sort((a, b) => ((a[2] as Date | null)?.getTime() ?? 0) - ((b[2] as Date | null)?.getTime() ?? 0))
        XLSX.utils.book_append_sheet(book, makeSheet([...lineTop, lineHeader, ...lineBody], lineTop.length,
            [{ width: 28 }, { width: 16 }, ...LINE_COLUMNS], lineTop.length + lineBody.length), sheetName(t('acct.excel.transactionsSheet')))
        return book
    }, `${t('acct.report.summaryFile')}_${fileStamp()}.xlsx`)
}

export interface StatementExcelInput {
    account: Account
    rows: AccountLine[]
    filters: string[]
    opening: number | null
    openingDate: string
    closing: number | null
    balance: number
    balanceLabel: string
}

// One account's transactions as shown, with the running balance
export function downloadAccountExcel({ account, rows, filters, opening, openingDate, closing, balance, balanceLabel }: StatementExcelInput) {
    const name = accountName(account, t)
    save(() => {
        const book = XLSX.utils.book_new()
        const cash = cashTotals(rows)
        const top: Cell[][] = [
            ...heading(`${t('acct.report.statementSubtitle')}: ${name}`, filters).slice(0, -1),
            [t('acct.col.type'), t(typeLabel(account.type))],
            ...(account.info ? [[t('acct.excel.info'), account.info] as Cell[]] : []),
            [balanceLabel, balance, balanceMeaning(account.type, balance)],
            [t('acct.stat.transactions'), rows.length],
            [t('acct.cash.in'), cash.moneyIn],
            [t('acct.cash.out'), cash.moneyOut],
            []
        ]
        const body: Cell[][] = []
        if (opening !== null) {
            body.push([toDate(openingDate), t('acct.opening'), '', '', '', '', '', '', null, null, opening, balanceMeaning(account.type, opening)])
        }
        body.push(...rows.map(line => lineRow(line, account.type)))
        const footer: Cell[][] = [
            [],
            closing !== null
                ? [t('acct.closing'), '', '', '', '', '', '', '', null, null, closing, balanceMeaning(account.type, closing)]
                : [t('acct.totalsShown')],
            [t('acct.cash.in'), '', '', '', '', '', '', '', cash.moneyIn],
            [t('acct.cash.out'), '', '', '', '', '', '', '', cash.moneyOut]
        ]
        const sheet = makeSheet([...top, LINE_HEADERS(), ...body, ...footer], top.length, LINE_COLUMNS, top.length + body.length)
        // Money format on the summary figures in the block above the table
        for (let r = 0; r < top.length; r++) {
            const cell = sheet[XLSX.utils.encode_cell({ r, c: 1 })]
            if (cell && cell.t === 'n' && r !== top.length - 1 && top[r][0] !== t('acct.stat.transactions')) cell.z = MONEY
        }
        XLSX.utils.book_append_sheet(book, sheet, sheetName(t('acct.report.statementSubtitle')))
        return book
    }, `${safeFileName(name)}_${t('acct.report.statementFile')}_${fileStamp()}.xlsx`)
}
