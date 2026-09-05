"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectProps {
  value: string | null | undefined;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  invalid?: boolean;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Select",
  disabled,
  id,
  className,
  invalid,
}: SelectProps) {
  return (
    <SelectPrimitive.Root value={value ?? ""} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={id}
        className={cn(
          "flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-line bg-white px-3.5 text-left text-[15px] text-ink outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-canvas disabled:text-muted data-[placeholder]:text-muted/70",
          invalid && "border-red-400",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} className="truncate" />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 shrink-0 text-muted" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-[1200] max-h-72 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-line bg-white shadow-lg"
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted">No options available</div>
            ) : null}
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer select-none items-start gap-2 rounded-lg px-3 py-2.5 text-[15px] text-ink outline-none data-[highlighted]:bg-brand-50 data-[state=checked]:font-semibold"
              >
                <div className="min-w-0 flex-1">
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  {option.description ? (
                    <p className="mt-0.5 text-xs font-normal text-muted">{option.description}</p>
                  ) : null}
                </div>
                <SelectPrimitive.ItemIndicator>
                  <Check className="mt-0.5 size-4 text-brand-600" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export function toOptions(values: readonly string[]): SelectOption[] {
  return values.map((value) => ({ value, label: value }));
}
