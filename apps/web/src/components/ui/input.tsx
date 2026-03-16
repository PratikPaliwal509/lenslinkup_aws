import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => (
    <div className="w-full">
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400',
          'border-slate-200 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent focus:bg-white',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-400 focus:ring-red-400',
          className,
        )}
        ref={ref}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  ),
)
Input.displayName = 'Input'

export { Input }
