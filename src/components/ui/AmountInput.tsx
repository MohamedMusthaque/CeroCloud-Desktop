import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import { useTranslation } from '@/i18n'
import { formatAmount } from '@/lib/utils'

type NativeProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'min' | 'max' | 'step'>

interface AmountInputProps extends NativeProps {
    // The plain number as text ('1234.5'), or a number
    value: string | number | null | undefined
    // Receives the plain number as text, without separators ('1234.5')
    onChange: (value: string) => void
    min?: number | string
    max?: number | string
    // Decimals allowed while typing
    decimals?: number
}

// Keeps digits and the first decimal point, with at most `decimals` decimals
function toPlain(text: string, decimals: number): string {
    let plain = ''
    let seenPoint = false
    let decimalsTyped = 0
    for (const char of text) {
        if (char >= '0' && char <= '9') {
            if (seenPoint) {
                if (decimalsTyped >= decimals) continue
                decimalsTyped++
            }
            plain += char
        } else if (char === '.' && !seenPoint && decimals > 0) {
            seenPoint = true
            plain += char
        }
    }
    // '007' -> '7', but keep '0' and '0.5'
    return plain.replace(/^0+(?=\d)/, '')
}

// '1234567.5' -> '1,234,567.5' (the decimals stay as typed)
function withSeparators(plain: string): string {
    if (!plain) return ''
    const [whole, fraction] = plain.split('.')
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return fraction === undefined ? grouped : `${grouped || '0'}.${fraction}`
}

// Number characters kept before `position` (separators and rejected keys don't count)
const significantBefore = (text: string, position: number, decimals: number) => toPlain(text.slice(0, position), decimals).length

// Money field that shows thousands separators while typing (1,250,000.00) but hands the form the plain number
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(function AmountInput(
    { value, onChange, min, max, decimals = 2, onBlur, ...props }, ref
) {
    const { t } = useTranslation()
    const inputRef = useRef<HTMLInputElement>(null)
    useImperativeHandle(ref, () => inputRef.current!)
    // Where the caret goes after the separators move, counted in number characters
    const pendingCaret = useRef<number | null>(null)

    const plain = value === null || value === undefined ? '' : toPlain(String(value), decimals)
    const shown = withSeparators(plain)

    // Every render: a rejected key leaves the text unchanged but React still moves the caret to the end
    useLayoutEffect(() => {
        const input = inputRef.current
        if (!input || pendingCaret.current === null || document.activeElement !== input) return
        const wanted = pendingCaret.current
        pendingCaret.current = null
        let position = 0
        let counted = 0
        while (position < shown.length && counted < wanted) {
            if (shown[position] !== ',') counted++
            position++
        }
        input.setSelectionRange(position, position)
    })

    // A text field has no native min / max checks: give the same feedback when the form is submitted
    useEffect(() => {
        const input = inputRef.current
        if (!input) return
        const amount = Number(plain)
        let message = ''
        if (plain && plain !== '.') {
            if (min !== undefined && min !== '' && amount < Number(min)) message = t('amountInput.min', { min: withSeparators(String(min)) })
            else if (max !== undefined && max !== '' && amount > Number(max)) message = t('amountInput.max', { max: formatAmount(Number(max)) })
        } else if (plain === '.') {
            message = t('amountInput.invalid')
        }
        input.setCustomValidity(message)
    }, [plain, min, max, t])

    return (
        <input
            {...props}
            ref={inputRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={shown}
            onChange={(e) => {
                const text = e.target.value
                pendingCaret.current = significantBefore(text, e.target.selectionStart ?? text.length, decimals)
                onChange(toPlain(text, decimals))
            }}
            onBlur={(e) => {
                // '12.' -> '12'
                if (plain.endsWith('.')) onChange(plain.slice(0, -1))
                onBlur?.(e)
            }}
        />
    )
})
