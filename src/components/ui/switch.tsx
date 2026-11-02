import { cn } from "@/lib/utils"

interface SwitchProps {
    checked: boolean
    onChange: (checked: boolean) => void
    className?: string
}

export function Switch({ checked, onChange, className }: SwitchProps) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2",
                checked ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700",
                className
            )}
        >
            <span
                className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    checked ? "translate-x-5" : "translate-x-0"
                )}
            />
        </button>
    )
}
