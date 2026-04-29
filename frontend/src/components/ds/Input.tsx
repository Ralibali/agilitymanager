import * as React from "react";
import { cn } from "@/lib/utils";

export interface DSInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const DSInput = React.forwardRef<HTMLInputElement, DSInputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-9 w-full rounded-ds-md bg-surface px-3 text-body font-sans-ds text-text-primary",
          "border-[0.5px] border-border-default",
          "placeholder:text-text-tertiary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-page",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
DSInput.displayName = "DSInput";
