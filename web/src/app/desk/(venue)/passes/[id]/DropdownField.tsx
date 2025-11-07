'use client'

import { useEffect, useRef, useState } from 'react'

type Option = { value: string; label: string }

type DropdownFieldProps = {
  name: string
  options: Option[]
  defaultValue: string
  className?: string
  buttonClassName?: string
}

export function DropdownField({
  name,
  options,
  defaultValue,
  className = '',
  buttonClassName = '',
}: DropdownFieldProps) {
  const initialValue = options.some((opt) => opt.value === defaultValue) ? defaultValue : options[0]?.value ?? ''
  const [value, setValue] = useState(initialValue)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current || containerRef.current.contains(event.target as Node)) return
      setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
    return undefined
  }, [open])

  const selectedLabel = options.find((option) => option.value === value)?.label ?? 'Select'

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        className={`flex w-full items-center justify-between rounded-full border border-[#E8E4D7] bg-[#F9F6ED] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#F4F1E7] ${buttonClassName}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{selectedLabel}</span>
        <span className="text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-full rounded-2xl border border-[#E8E4D7] bg-[#F9F6ED] py-2 text-sm shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`block w-full px-4 py-2 text-left ${
                option.value === value ? 'font-semibold text-black' : 'text-[#4F514D]'
              } hover:bg-[#F4F1E7]`}
              onClick={() => {
                setValue(option.value)
                setOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
