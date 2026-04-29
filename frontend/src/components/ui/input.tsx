import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Phase 6: smooth border + glow + slight lift on focus
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background",
          "transition-[border-color,box-shadow,background-color] duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          "hover:border-input/60",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground placeholder:transition-opacity focus:placeholder:opacity-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-ring",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
