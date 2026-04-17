import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const dsButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans-ds text-[13px] font-medium rounded-ds-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-page disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand-500 text-white hover:bg-brand-600",
        secondary:
          "bg-transparent text-text-primary border-[0.5px] border-border-default hover:bg-subtle",
        ghost: "bg-transparent text-text-primary hover:bg-subtle",
        destructive: "bg-semantic-danger text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 [&_svg]:size-3.5",
        md: "h-9 px-3.5 [&_svg]:size-4",
        lg: "h-10 px-4 [&_svg]:size-4",
        icon: "h-9 w-9 [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface DSButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof dsButtonVariants> {
  asChild?: boolean;
}

export const DSButton = React.forwardRef<HTMLButtonElement, DSButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(dsButtonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
DSButton.displayName = "DSButton";

export { dsButtonVariants };
