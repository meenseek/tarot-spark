export const interactiveFocusClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ts-action";

export const interactiveMotionClassName =
  "transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--ts-motion-base)] ease-[var(--ts-motion-ease)]";

export const brandLinkClassName = `${interactiveFocusClassName} ${interactiveMotionClassName} inline-flex min-h-11 items-center rounded-ts-control font-semibold text-ts-action hover:text-ts-action-hover active:text-ts-action-pressed`;

export const footerLinkClassName = `${interactiveFocusClassName} ${interactiveMotionClassName} inline-flex min-h-11 min-w-11 items-center justify-center rounded-ts-control px-1 text-ts-muted hover:text-ts-action active:text-ts-action-pressed`;

export const primaryButtonClassName = `${interactiveFocusClassName} ${interactiveMotionClassName} inline-flex min-h-12 items-center justify-center rounded-ts-control border-2 border-ts-action bg-ts-action px-5 py-3 text-center text-sm font-semibold text-ts-on-action hover:border-ts-action-hover hover:bg-ts-action-hover active:translate-y-px active:border-ts-action-pressed active:bg-ts-action-pressed`;

export const secondaryButtonClassName = `${interactiveFocusClassName} ${interactiveMotionClassName} inline-flex min-h-11 items-center justify-center rounded-ts-control border-2 border-ts-border bg-ts-surface px-4 py-2 text-center text-sm font-semibold leading-5 text-ts-ink hover:border-ts-action hover:bg-ts-blush active:translate-y-px active:border-ts-action-pressed active:bg-ts-blush-strong`;
