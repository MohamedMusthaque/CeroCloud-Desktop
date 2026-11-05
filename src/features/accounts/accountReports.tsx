import { toast } from 'sonner'
import { t } from '@/i18n'
import { pdfGenerator } from '@/services/pdfGenerator'
import { companyService } from '@/services/companyService'
import { AccountsSummaryPage, AccountStatementPage, type SummaryRow } from '@/components/print/AccountsReportTemplate'
import { BALANCE_MODES, accountName, cashTotals, type Account, type AccountLine } from './accountLedger'

// Rows that fit an A4 page (the first page also has the summary cards); the last page keeps room for the totals
const SUMMARY_ROWS = { first: 16, other: 20 }
const STATEMENT_ROWS = { first: 12, other: 16 }
const TOTALS_ROOM = 2

function paginate<T>(rows: T[], perPage: { first: number; other: number }): T[][] {
    const pages: T[][] = []
    let index = 0
    do {
        const size = pages.length === 0 ? perPage.first : perPage.other
        pages.push(rows.slice(index, index + size))
        index += size
    } while (index < rows.length)
    // Totals go under the last page's rows: start a new page if it's full
    const last = pages[pages.length - 1]
    const lastSize = pages.length === 1 ? perPage.first : perPage.other
    if (last.length > lastSize - TOTALS_ROOM) pages.push(last.splice(lastSize - TOTALS_ROOM))
    return pages
}

const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, '').trim() || 'account'
const today = () => new Date().toISOString().split('T')[0]

function download(pages: React.ReactNode[], filename: string) {
    return toast.promise(pdfGenerator.generatePages(pages, filename), {
        loading: t('rep.export.generating'), success: t('rep.export.success'), error: t('rep.export.error')
    })
}

export interface SummaryReportInput {
    rows: SummaryRow[]
    filters: string[]
    // Column heading for the balance (e.g. "Balance at 31/10/2026")
    balanceLabel: string
}

// The Accounts list as shown: every account with its transactions, last activity and balance
export function downloadAccountsSummary({ rows, filters, balanceLabel }: SummaryReportInput) {
    const settings = companyService.getSettings()
    const parties = rows.filter(row => BALANCE_MODES[row.account.type] === 'party')
    const totals = {
        transactions: rows.reduce((sum, row) => sum + row.count, 0),
        owedToYou: parties.reduce((sum, row) => sum + Math.max(row.balance, 0), 0),
        youOwe: parties.reduce((sum, row) => sum + Math.max(-row.balance, 0), 0)
    }
    const chunks = paginate(rows, SUMMARY_ROWS)
    const pages = chunks.map((chunk, index) => (
        <AccountsSummaryPage
            key={index}
            settings={settings}
            filters={filters}
            rows={chunk}
            stats={index === 0 ? { accounts: rows.length, ...totals, balanceLabel } : undefined}
            showTotals={index === chunks.length - 1 && rows.length > 0}
            totals={totals}
            page={{ current: index + 1, total: chunks.length }}
        />
    ))
    return download(pages, `${t('acct.report.summaryFile')}_${today()}.pdf`)
}

export interface StatementReportInput {
    account: Account
    rows: AccountLine[]
    filters: string[]
    // Balance brought forward when a start date is set
    opening: number | null
    openingDate: string
    // Closing balance (null when a kind or search filter hides some lines)
    closing: number | null
    // Balance shown on the first card and its label
    balance: number
    balanceLabel: string
}

// One account's transactions as shown, with the running balance
export function downloadAccountStatement({ account, rows, filters, opening, openingDate, closing, balance, balanceLabel }: StatementReportInput) {
    const settings = companyService.getSettings()
    const cash = cashTotals(rows)
    const chunks = paginate(rows, STATEMENT_ROWS)
    const pages = chunks.map((chunk, index) => (
        <AccountStatementPage
            key={index}
            settings={settings}
            account={account}
            filters={filters}
            rows={chunk}
            first={index === 0 ? { balance, balanceLabel, transactions: rows.length, ...cash, opening, openingDate } : undefined}
            last={index === chunks.length - 1 ? { closing, ...cash, label: closing !== null ? t('acct.closing') : t('acct.totalsShown') } : undefined}
            page={{ current: index + 1, total: chunks.length }}
        />
    ))
    return download(pages, `${safeFileName(accountName(account, t))}_${t('acct.report.statementFile')}_${today()}.pdf`)
}
