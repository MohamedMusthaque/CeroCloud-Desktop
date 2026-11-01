import { useCallback, useEffect, useState } from 'react'

// Loads one record; `null` = not found. Pass a memoized `load` (useCallback); call `reload()` after an edit.
export function useRecord<T>(load: () => Promise<T | null | undefined>) {
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(true)

    const reload = useCallback(async () => {
        try {
            setData((await load()) ?? null)
        } catch (error) {
            console.error('Error loading record:', error)
            setData(null)
        } finally {
            setLoading(false)
        }
    }, [load])

    useEffect(() => {
        setLoading(true)
        reload()
    }, [reload])

    return { data, loading, reload }
}

// Route params are strings; anything that isn't a positive integer is treated as "not found"
export function parseId(value: string | undefined): number | null {
    const id = Number(value)
    return Number.isInteger(id) && id > 0 ? id : null
}
