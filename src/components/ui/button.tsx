import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Phase 6 micro-interactions: smooth 180ms transitions, active-scale, subtle lift on hover for filled variants
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-[180ms] ease-[cubic-bezier(0.4,0,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-px hover:shadow-[0_4px_12px_-2px_hsl(var(--primary)/0.3)] motion-reduce:hover:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:-translate-y-px hover:shadow-[0_4px_12px_-2px_hsl(var(--destructive)/0.3)] motion-reduce:hover:translate-y-0",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-input/60",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:-translate-y-px motion-reduce:hover:translate-y-0",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // === Brand foundation (opt-in via variant="brand" / "brand-outline") ===
        brand:
          "bg-forest text-bone hover:bg-forest-soft rounded-pill-full px-5 py-2.5 text-sm font-medium",
        "brand-outline":
          "border border-forest text-forest bg-transparent hover:bg-forest hover:text-bone rounded-pill-full px-5 py-2.5 text-sm font-medium",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        style={{ borderRadius: 'var(--radius-button)' }}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
