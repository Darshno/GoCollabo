import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type FilterDropdownProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label?: string;
  ariaLabel: string;
  defaultValue?: string;
  formatOptionLabel?: (option: string) => string;
  className?: string;
  align?: "start" | "end" | "center";
};

export function FilterDropdown({
  value,
  onChange,
  options,
  label,
  ariaLabel,
  defaultValue,
  formatOptionLabel,
  className,
  align = "start",
}: FilterDropdownProps) {
  const isDefault = defaultValue !== undefined ? value === defaultValue : false;
  const isActive = defaultValue !== undefined && !isDefault;
  const displayLabel = formatOptionLabel ? formatOptionLabel(value) : value;

  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          "group relative inline-flex h-10 min-w-0 sm:min-w-[95px] max-w-full flex-1 sm:flex-none items-center justify-between gap-1.5 rounded-xl border px-2.5 text-xs sm:text-[13px] font-medium tracking-[-0.01em] transition-all duration-150 outline-none select-none appearance-none",
          "focus-visible:ring-2 focus-visible:ring-[#0B0D12] focus-visible:ring-offset-1 focus-visible:border-[#0B0D12]",
          isActive
            ? "border-[#0B0D12] bg-[#F8F7F2] text-[#0B0D12] ring-1 ring-[#C8F568] shadow-[0_1px_6px_rgba(200,245,104,0.3)] hover:border-[#0B0D12] hover:bg-[#F8F7F2]"
            : "border-[#0B0D12]/15 bg-[#F8F7F2] text-[#0B0D12] hover:border-[#C8F568] hover:bg-[#F8F7F2] hover:shadow-[0_1px_6px_rgba(200,245,104,0.2)] data-[state=open]:border-[#0B0D12] data-[state=open]:ring-2 data-[state=open]:ring-[#C8F568]/40 data-[state=open]:bg-[#F8F7F2]",
          className
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {label && (
            <span className="text-[#0B0D12]/70 text-[10px] leading-none uppercase tracking-[0.06em] font-semibold hidden lg:inline shrink-0 transition-colors group-hover:text-[#0B0D12]">
              {label}:
            </span>
          )}
          <SelectPrimitive.Value placeholder={displayLabel} className="truncate text-[#0B0D12] font-medium text-xs sm:text-[13px] leading-none tracking-[-0.01em]">
            {displayLabel}
          </SelectPrimitive.Value>
        </span>
        <div className="flex items-center gap-1 shrink-0 pl-0.5">
          <span
            className={cn(
              "rounded-full transition-all duration-200",
              isActive
                ? "h-2 w-2 bg-[#C8F568] border border-[#0B0D12]/50 shadow-[0_0_8px_rgba(200,245,104,0.7)]"
                : "h-1 w-1 bg-[#C8F568] opacity-70 group-hover:opacity-100 group-hover:scale-125"
            )}
            aria-hidden="true"
          />
          <SelectPrimitive.Icon asChild>
            <ChevronDown
              size={12}
              className="text-[#8A8D98] shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180 group-hover:text-[#0B0D12]"
            />
          </SelectPrimitive.Icon>
        </div>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          align={align}
          collisionPadding={12}
          className={cn(
            "z-50 min-w-[170px] max-h-[300px] overflow-hidden rounded-2xl border border-[#0B0D12]/15 bg-[#F8F7F2] p-1.5 text-[#0B0D12] shadow-[0_16px_36px_rgba(11,13,18,0.14)]",
            "origin-(--radix-select-content-transform-origin)",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1.5 data-[side=top]:slide-in-from-bottom-1.5 duration-150"
          )}
        >
          <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1 text-[#8A8D98]">
            <ChevronUp size={14} />
          </SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-0.5 space-y-0.5">
            {options.map(option => {
              const isSelected = option === value;
              const formatted = formatOptionLabel
                ? formatOptionLabel(option)
                : option;
              return (
                <SelectPrimitive.Item
                  key={option}
                  value={option}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-2.5 py-1.5 text-xs sm:text-[13px] font-medium outline-none transition-colors",
                    "data-[highlighted]:bg-[#C8F568]/25 data-[highlighted]:text-[#0B0D12]",
                    isSelected
                      ? "bg-white font-medium text-[#0B0D12] shadow-xs"
                      : "text-[#0B0D12]/85 hover:text-[#0B0D12]"
                  )}
                >
                  <SelectPrimitive.ItemText>{formatted}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator asChild>
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#C8F568] text-[#0B0D12] shadow-xs">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              );
            })}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1 text-[#8A8D98]">
            <ChevronDown size={14} />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
