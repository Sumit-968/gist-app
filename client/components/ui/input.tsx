import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-slate-950 dark:file:text-slate-50 placeholder:text-slate-500 dark:placeholder:text-slate-400 selection:bg-[#ff6600] selection:text-white border-slate-200 dark:border-slate-800 h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-none transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-slate-900 dark:text-slate-50",
        "focus-visible:border-[#ff6600] focus-visible:ring-[#ff6600]/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
