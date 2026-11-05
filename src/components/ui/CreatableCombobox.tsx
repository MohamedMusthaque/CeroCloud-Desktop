import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Plus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreatableComboboxProps {
    id?: string
    value: string
    onChange: (value: string) => void
    // Values that already exist (picked as-is)
    options: string[]
    // Ideas listed after the options when they aren't one already
    suggestions?: string[]
    // Label of the last item when the typed text matches nothing, e.g. 'Create "ABC"'
    createLabel: (text: string) => string
    suggestionLabel?: string
    required?: boolean
    placeholder?: string
    inputClassName?: string
    'aria-describedby'?: string
}

type Item = { value: string; kind: 'option' | 'suggestion' | 'create' }

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

// Text field with a dropdown of existing values; typing a value that isn't there offers to create it
export function CreatableCombobox({
    id, value, onChange, options, suggestions = [], createLabel, suggestionLabel, required, placeholder, inputClassName,
    'aria-describedby': describedBy
}: CreatableComboboxProps) {
    const [open, setOpen] = useState(false)
    // Text typed since the list opened; empty shows every value
    const [filter, setFilter] = useState('')
    const [active, setActive] = useState(0)
    const [rect, setRect] = useState<DOMRect | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const itemRefs = useRef<(HTMLLIElement | null)[]>([])
    const listId = useId()

    const items = useMemo(() => {
        const query = filter.trim().toLowerCase()
        const matches = (text: string) => !query || text.toLowerCase().includes(query)
        const seen = new Set<string>()
        const list: Item[] = []
        for (const option of options) {
            const key = option.toLowerCase()
            if (seen.has(key)) continue
            seen.add(key)
            if (matches(option)) list.push({ value: option, kind: 'option' })
        }
        for (const suggestion of suggestions) {
            const key = suggestion.toLowerCase()
            if (seen.has(key)) continue
            seen.add(key)
            if (matches(suggestion)) list.push({ value: suggestion, kind: 'suggestion' })
        }
        const typed = value.trim()
        if (typed && !seen.has(typed.toLowerCase())) list.push({ value: typed, kind: 'create' })
        return list
    }, [options, suggestions, filter, value])

    const openList = () => {
        setFilter('')
        setOpen(true)
    }

    // Start on the current value when there is one
    useEffect(() => {
        if (!open) return
        const current = items.findIndex(item => sameText(item.value, value))
        setActive(current >= 0 ? current : 0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, filter])

    useEffect(() => {
        if (open) itemRefs.current[active]?.scrollIntoView({ block: 'nearest' })
    }, [active, open])

    // The list is portaled so the modal's scroll area doesn't clip it: follow the field
    useLayoutEffect(() => {
        if (!open) return
        const update = () => inputRef.current && setRect(inputRef.current.getBoundingClientRect())
        update()
        window.addEventListener('resize', update)
        window.addEventListener('scroll', update, true)
        return () => {
            window.removeEventListener('resize', update)
            window.removeEventListener('scroll', update, true)
        }
    }, [open])

    const select = (item: Item) => {
        onChange(item.value)
        setOpen(false)
    }

    // Typed in another case than an existing value: use the existing spelling
    const handleBlur = () => {
        setOpen(false)
        const existing = options.find(option => sameText(option, value))
        if (existing && existing !== value) onChange(existing)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            if (!open) return openList()
            if (items.length === 0) return
            setActive(i => (i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length)
        } else if (e.key === 'Enter' && open && items[active]) {
            // Pick the highlighted value instead of submitting the form
            e.preventDefault()
            select(items[active])
        } else if (e.key === 'Escape' && open) {
            e.preventDefault()
            e.stopPropagation()
            setOpen(false)
        }
    }

    const spaceBelow = rect ? window.innerHeight - rect.bottom : 0
    const dropUp = !!rect && spaceBelow < 240 && rect.top > spaceBelow
    const showList = open && items.length > 0 && rect

    return (
        <div className="relative">
            <input
                ref={inputRef}
                id={id}
                type="text"
                role="combobox"
                aria-expanded={!!showList}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={showList ? `${listId}-${active}` : undefined}
                aria-describedby={describedBy}
                autoComplete="off"
                required={required}
                value={value}
                placeholder={placeholder}
                onChange={(e) => { onChange(e.target.value); setFilter(e.target.value); setOpen(true) }}
                onFocus={openList}
                onClick={() => !open && openList()}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={cn(inputClassName, "pr-10")}
            />
            <button
                type="button"
                tabIndex={-1}
                aria-label={placeholder}
                onMouseDown={(e) => {
                    // Keep focus in the field
                    e.preventDefault()
                    if (open) setOpen(false)
                    else { inputRef.current?.focus(); openList() }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
                <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
            </button>

            {showList && createPortal(
                <ul
                    id={listId}
                    role="listbox"
                    style={{
                        position: 'fixed',
                        left: rect.left,
                        width: rect.width,
                        ...(dropUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 })
                    }}
                    className="z-[70] max-h-60 overflow-y-auto py-1 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl"
                >
                    {items.map((item, index) => {
                        const selected = item.kind !== 'create' && sameText(item.value, value)
                        return (
                            <li
                                key={`${item.kind}-${item.value}`}
                                id={`${listId}-${index}`}
                                ref={el => { itemRefs.current[index] = el }}
                                role="option"
                                aria-selected={selected}
                                onMouseDown={(e) => { e.preventDefault(); select(item) }}
                                onMouseEnter={() => setActive(index)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer",
                                    index === active ? "bg-primary/10" : "",
                                    item.kind === 'create' ? "text-primary font-semibold border-t border-gray-100 dark:border-gray-700" : "text-gray-700 dark:text-gray-200"
                                )}
                            >
                                {item.kind === 'create'
                                    ? <Plus className="w-4 h-4 shrink-0" />
                                    : item.kind === 'suggestion'
                                        ? <Sparkles className="w-4 h-4 shrink-0 text-gray-400" />
                                        : <Check className={cn("w-4 h-4 shrink-0 text-primary", !selected && "invisible")} />}
                                <span className="truncate flex-1">{item.kind === 'create' ? createLabel(item.value) : item.value}</span>
                                {item.kind === 'suggestion' && suggestionLabel && (
                                    <span className="text-[10px] uppercase tracking-wider text-gray-400 shrink-0">{suggestionLabel}</span>
                                )}
                            </li>
                        )
                    })}
                </ul>,
                document.body
            )}
        </div>
    )
}
