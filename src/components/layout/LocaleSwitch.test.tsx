import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleSwitch } from "./LocaleSwitch";

const links = [
  { href: "/", label: "English", locale: "en" },
  { href: "/ko", label: "한국어", locale: "ko" },
] as const;

describe("LocaleSwitch", () => {
  afterEach(cleanup);

  it("keeps the active locale in place", () => {
    const onLocaleChange = vi.fn();
    renderSwitch(onLocaleChange);
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });

    expect(
      screen.getByRole("link", { name: "English" }).dispatchEvent(clickEvent),
    ).toBe(false);
    expect(onLocaleChange).not.toHaveBeenCalled();
  });

  it("preserves private context only for an ordinary same-tab click", () => {
    const onLocaleChange = vi.fn();
    renderSwitch(onLocaleChange);
    const koreanLink = screen.getByRole("link", { name: "한국어" });
    koreanLink.addEventListener("click", (event) => event.preventDefault());

    fireEvent.click(koreanLink, { ctrlKey: true });
    fireEvent.click(koreanLink, { metaKey: true });
    fireEvent.click(koreanLink, { shiftKey: true });
    expect(onLocaleChange).not.toHaveBeenCalled();

    fireEvent.click(koreanLink);
    expect(onLocaleChange).toHaveBeenCalledOnce();
    expect(onLocaleChange).toHaveBeenCalledWith("ko");
  });
});

function renderSwitch(onLocaleChange: (locale: "en" | "ko") => void) {
  return render(
    <LocaleSwitch
      activeLocale="en"
      ariaLabel="Choose language"
      links={links}
      onLocaleChange={onLocaleChange}
    />,
  );
}
