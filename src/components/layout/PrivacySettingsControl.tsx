"use client";

import { createContext, useContext, type ReactNode } from "react";
import { footerLinkClassName } from "@/components/visual/class-names";

type PrivacySettingsControl = {
  readonly isVisible: boolean;
  readonly label: string;
  readonly onOpen: () => void;
};

export const privacySettingsButtonId = "privacy-settings-button";

const PrivacySettingsContext = createContext<PrivacySettingsControl | null>(
  null,
);

type PrivacySettingsProviderProps = {
  readonly children: ReactNode;
  readonly value: PrivacySettingsControl;
};

export function PrivacySettingsProvider({
  children,
  value,
}: PrivacySettingsProviderProps) {
  return (
    <PrivacySettingsContext.Provider value={value}>
      {children}
    </PrivacySettingsContext.Provider>
  );
}

export function PrivacySettingsButton() {
  const control = useContext(PrivacySettingsContext);

  if (!control?.isVisible) {
    return null;
  }

  return (
    <button
      className={footerLinkClassName}
      id={privacySettingsButtonId}
      onClick={control.onOpen}
      type="button"
    >
      {control.label}
    </button>
  );
}
