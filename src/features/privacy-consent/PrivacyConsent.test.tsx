import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PrivacyConsent } from "./PrivacyConsent";

const navigationState = vi.hoisted(() => ({
  pathname: "/relationship-flow",
}));
const failClosedSessionStorageKey = "tarot-spark.optional-services-fail-closed";
const failClosedCookieName = "tarot_spark_optional_services_fail_closed";
const sessionStorageDescriptor = Object.getOwnPropertyDescriptor(
  window,
  "sessionStorage",
);

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}));

const copy = {
  heading: "Optional privacy choices",
  body: "Choose optional services.",
  analyticsLabel: "Analytics",
  analyticsDescription: "Measure product use.",
  advertisingLabel: "Advertising",
  advertisingDescription: "Load advertising.",
  saveChoices: "Save choices",
  rejectOptional: "Essential only",
  settingsButton: "Privacy choices",
  storageError:
    "We couldn't save your choices. Try again in this panel so they can be applied safely.",
} as const;

describe("PrivacyConsent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    navigationState.pathname = "/relationship-flow";
    window.localStorage.clear();
    restoreSessionStorage();
    window.sessionStorage.clear();
    document.cookie = `${failClosedCookieName}=; Path=/; SameSite=Strict; Max-Age=0`;
    Reflect.deleteProperty(window, "ga-disable-G-TEST1234");
    Reflect.deleteProperty(window, "dataLayer");
    Reflect.deleteProperty(window, "gtag");
    document
      .querySelectorAll(
        'script[src*="googletagmanager.com"], script[src*="googlesyndication.com"]',
      )
      .forEach((element) => element.remove());
  });

  it("loads no optional script and shows only footer settings on first visit", async () => {
    renderConsent();

    expect(
      await screen.findByRole("button", { name: "Privacy choices" }),
    ).toBeVisible();
    expect(screen.getByRole("main")).toHaveTextContent("Product content");
    expect(
      screen.queryByRole("checkbox", { name: /Analytics/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Optional privacy choices" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(getGoogleScripts()).toHaveLength(0);
    expect(window.localStorage.getItem(getConsentStorageKey())).toBeNull();
  });

  it("uses configured defaults only when no stored choice exists", async () => {
    render(
      getConsentElement(
        undefined,
        "Product content",
        "ca-pub-1234567890123401",
        "G-DEFAULT1234",
        { analytics: true, advertising: true },
      ),
    );

    expect(
      await screen.findByRole("button", { name: "Privacy choices" }),
    ).toBeVisible();
    expect(
      document.querySelector('script[src*="googletagmanager.com"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('script[src*="googlesyndication.com"]'),
    ).not.toBeNull();
    expect(window.localStorage.getItem(getConsentStorageKey())).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Privacy choices" }));
    expect(screen.getByRole("checkbox", { name: /Analytics/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Advertising/ })).toBeChecked();
  });

  it("keeps a stored rejection ahead of configured defaults", async () => {
    setStoredRejection();

    render(
      getConsentElement(
        undefined,
        "Product content",
        "ca-pub-1234567890123402",
        "G-STORED1234",
        { analytics: true, advertising: true },
      ),
    );

    expect(
      await screen.findByRole("button", { name: "Privacy choices" }),
    ).toBeVisible();
    expect(getGoogleScripts()).toHaveLength(0);
    expect(window.dataLayer).toContainEqual([
      "consent",
      "update",
      {
        ad_personalization: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        analytics_storage: "denied",
      },
    ]);
  });

  it("fails closed when the current choice cannot be read", async () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable", "SecurityError");
    });

    render(
      getConsentElement(
        undefined,
        "Product content",
        "ca-pub-1234567890123403",
        "G-UNAVAILABLE1234",
        { analytics: true, advertising: true },
      ),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      copy.storageError,
    );
    expect(getGoogleScripts()).toHaveLength(0);
  });

  it("enables analytics without advertising from footer settings", async () => {
    renderConsent();

    fireEvent.click(
      await screen.findByRole("button", { name: "Privacy choices" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Analytics/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));

    await waitFor(() => {
      expect(
        document.querySelector('script[src*="googletagmanager.com"]'),
      ).not.toBeNull();
    });
    expect(
      document.querySelector('script[src*="googlesyndication.com"]'),
    ).toBeNull();
    expect(window.localStorage.getItem(getConsentStorageKey())).toBe(
      JSON.stringify({ analytics: true, advertising: false }),
    );
  });

  it("opens full choices from footer settings and focuses the heading", async () => {
    renderConsent();

    fireEvent.click(
      await screen.findByRole("button", { name: "Privacy choices" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Optional privacy choices" }),
      ).toHaveFocus();
    });
    expect(screen.getByRole("checkbox", { name: /Analytics/ })).toBeVisible();
    expect(getGoogleScripts()).toHaveLength(0);
  });

  it("offers only advertising from footer settings when it is the sole service", async () => {
    render(
      getConsentElement(undefined, "Product content", "ca-pub-test", undefined),
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Privacy choices" }),
    );

    expect(screen.getByRole("checkbox", { name: /Advertising/ })).toBeVisible();
    expect(
      screen.queryByRole("checkbox", { name: /Analytics/ }),
    ).not.toBeInTheDocument();
    expect(getGoogleScripts()).toHaveLength(0);
  });

  it("offers only analytics from footer settings when it is the sole service", async () => {
    render(
      getConsentElement(undefined, "Product content", undefined, "G-TEST1234"),
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Privacy choices" }),
    );

    expect(screen.getByRole("checkbox", { name: /Analytics/ })).toBeVisible();
    expect(
      screen.queryByRole("checkbox", { name: /Advertising/ }),
    ).not.toBeInTheDocument();
    expect(getGoogleScripts()).toHaveLength(0);
  });

  it("shows no privacy settings trigger without configured optional services", () => {
    render(
      getConsentElement(undefined, "Product content", undefined, undefined),
    );

    expect(screen.getByRole("main")).toHaveTextContent("Product content");
    expect(
      screen.queryByRole("button", { name: "Privacy choices" }),
    ).not.toBeInTheDocument();
  });

  it("keeps a reload-bridged storage failure ahead of stale consent", async () => {
    window.localStorage.setItem(
      getConsentStorageKey(),
      JSON.stringify({ analytics: true, advertising: true }),
    );
    window.sessionStorage.setItem(failClosedSessionStorageKey, "1");

    renderConsent();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      copy.storageError,
    );
    expect(
      screen.getByRole("heading", { name: "Optional privacy choices" }),
    ).toBeVisible();
    expect(getGoogleScripts()).toHaveLength(0);
    expect(
      screen.getByRole("checkbox", { name: /Analytics/ }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /Advertising/ }),
    ).not.toBeChecked();
  });

  it("keeps each full privacy option label interactive", async () => {
    renderConsent();

    fireEvent.click(
      await screen.findByRole("button", { name: "Privacy choices" }),
    );

    const analytics = screen.getByRole("checkbox", {
      name: /Analytics/,
    });
    fireEvent.click(screen.getByText(copy.analyticsDescription));

    expect(analytics).toBeChecked();
  });

  it("fails closed for an invalid current record and removes legacy entries", async () => {
    window.localStorage.setItem(
      `${getConsentStorageKey()}.legacy`,
      JSON.stringify({ analytics: true, advertising: true }),
    );
    window.localStorage.setItem(
      getConsentStorageKey(),
      JSON.stringify({
        analytics: true,
        advertising: true,
        unexpected: true,
      }),
    );

    renderConsent();

    expect(
      await screen.findByRole("heading", {
        name: "Optional privacy choices",
      }),
    ).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(copy.storageError);
    expect(getGoogleScripts()).toHaveLength(0);
    expect(
      window.localStorage.getItem(`${getConsentStorageKey()}.legacy`),
    ).toBeNull();
  });

  it("loads only explicitly selected services and allows later changes", async () => {
    const reloadDocument = vi.fn();
    renderConsent(
      reloadDocument,
      "Product content",
      "ca-pub-1234567890123456",
      "G-TEST5678",
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Privacy choices" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Analytics/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));

    await waitFor(() => {
      expect(
        document.querySelector('script[src*="googletagmanager.com"]'),
      ).not.toBeNull();
    });
    expect(
      document.querySelector('script[src*="googlesyndication.com"]'),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Privacy choices" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Advertising/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));

    await waitFor(() => {
      expect(
        document.querySelector('script[src*="googlesyndication.com"]'),
      ).not.toBeNull();
    });
    expect(reloadDocument).toHaveBeenCalledOnce();
  });

  it("persists an explicit rejection without loading optional scripts", async () => {
    renderConsent();

    fireEvent.click(
      await screen.findByRole("button", { name: "Privacy choices" }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Essential only",
      }),
    );

    expect(getGoogleScripts()).toHaveLength(0);
    const settingsButton = screen.getByRole("button", {
      name: "Privacy choices",
    });

    expect(settingsButton).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: "Privacy choices" }),
    ).toHaveLength(1);
    expect(screen.getByTestId("site-footer")).toContainElement(settingsButton);
    expect(settingsButton).not.toHaveClass("fixed");
    expect(window.localStorage.getItem(getConsentStorageKey())).toContain(
      '"analytics":false',
    );
    expect(window.dataLayer).toContainEqual([
      "consent",
      "update",
      {
        ad_personalization: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        analytics_storage: "denied",
      },
    ]);
  });

  it("reloads before re-enabling a locally denied service", async () => {
    const reloadDocument = vi.fn();
    navigationState.pathname = "/";
    render(
      getConsentElement(
        reloadDocument,
        "Product content",
        "ca-pub-1234567890123404",
        "G-REENABLE1234",
        { analytics: true, advertising: true },
      ),
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Privacy choices" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Advertising/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));
    expect(reloadDocument).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Privacy choices" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Advertising/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));

    expect(reloadDocument).toHaveBeenCalledOnce();
  });

  it("does not steal focus when footer settings appears", async () => {
    renderConsent();

    const settingsButton = await screen.findByRole("button", {
      name: "Privacy choices",
    });

    expect(settingsButton).not.toHaveFocus();
    expect(
      screen.queryByRole("heading", { name: "Optional privacy choices" }),
    ).not.toBeInTheDocument();
  });

  it("focuses the panel heading when settings opens and restores the trigger after saving", async () => {
    setStoredRejection();
    renderConsent();

    const settingsButton = await screen.findByRole("button", {
      name: "Privacy choices",
    });
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Optional privacy choices" }),
      ).toHaveFocus();
    });
    expect(
      screen.queryByRole("button", { name: "Privacy choices" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));

    await waitFor(() => {
      const restoredSettingsButton = screen.getByRole("button", {
        name: "Privacy choices",
      });

      expect(restoredSettingsButton).toHaveFocus();
      expect(
        screen.getAllByRole("button", { name: "Privacy choices" }),
      ).toHaveLength(1);
      expect(screen.getByTestId("site-footer")).toContainElement(
        restoredSettingsButton,
      );
    });
  });

  it("restores the settings trigger after rejecting without a reload", async () => {
    setStoredRejection();
    renderConsent();

    fireEvent.click(
      await screen.findByRole("button", { name: "Privacy choices" }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Optional privacy choices" }),
      ).toHaveFocus();
    });

    fireEvent.click(screen.getByRole("button", { name: "Essential only" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Privacy choices" }),
      ).toHaveFocus();
    });
  });

  it("hydrates stored choices under React strict effects", async () => {
    window.localStorage.setItem(
      getConsentStorageKey(),
      JSON.stringify({
        analytics: false,
        advertising: false,
      }),
    );

    render(
      <StrictMode>
        {getConsentElement(
          undefined,
          "Product content",
          "ca-pub-1234567890123456",
          "G-TEST1234",
        )}
      </StrictMode>,
    );

    expect(
      await screen.findByRole("button", { name: "Privacy choices" }),
    ).toBeVisible();
  });

  it.each([
    "/",
    "/ko",
    "/share",
    "/ko/share",
    "/daily",
    "/ko/daily",
    "/about",
    "/ko/about",
    "/contact",
    "/ko/contact",
    "/disclaimer",
    "/ko/disclaimer",
    "/privacy",
    "/ko/privacy",
    "/tarot-questions",
    "/ko/tarot-questions",
  ])("never loads AdSense on non-allowlisted route %s", async (pathname) => {
    navigationState.pathname = pathname;
    window.localStorage.setItem(
      getConsentStorageKey(),
      JSON.stringify({
        analytics: false,
        advertising: true,
      }),
    );

    renderConsent();

    expect(
      await screen.findByRole("button", { name: "Privacy choices" }),
    ).toBeVisible();
    expect(
      document.querySelector('script[src*="googlesyndication.com"]'),
    ).toBeNull();
    expect(screen.getByRole("main")).toHaveTextContent("Product content");
  });

  it.each([
    "/",
    "/ko",
    "/share",
    "/ko/share",
    "/daily",
    "/ko/daily",
    "/about",
    "/ko/about",
    "/contact",
    "/ko/contact",
    "/disclaimer",
    "/ko/disclaimer",
    "/privacy",
    "/ko/privacy",
    "/tarot-questions",
    "/ko/tarot-questions",
  ])(
    "withholds non-allowlisted route %s until the document reloads",
    async (pathname) => {
      const reloadDocument = vi.fn();
      const advertisingClientId = "ca-pub-1234567890123457";
      const { rerender } = renderConsent(
        reloadDocument,
        "Public content",
        advertisingClientId,
      );

      fireEvent.click(
        await screen.findByRole("button", { name: "Privacy choices" }),
      );
      fireEvent.click(
        await screen.findByRole("checkbox", { name: /Advertising/ }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Save choices" }));
      await act(async () => {
        await Promise.resolve();
      });
      expect(window.localStorage.getItem(getConsentStorageKey())).toContain(
        '"advertising":true',
      );

      navigationState.pathname = pathname;
      rerender(
        getConsentElement(
          reloadDocument,
          "Sensitive reading content",
          advertisingClientId,
          "G-TEST1234",
        ),
      );

      expect(screen.queryByText("Sensitive reading content")).toBeNull();
      expect(reloadDocument).toHaveBeenCalledOnce();
    },
  );

  it.each([
    {
      advertisingClientId: "ca-pub-1234567890123491",
      pathname: "/relationship-flow",
    },
    {
      advertisingClientId: "ca-pub-1234567890123492",
      pathname: "/ko/relationship-flow",
    },
    {
      advertisingClientId: "ca-pub-1234567890123493",
      pathname: "/relationship-tarot-questions",
    },
    {
      advertisingClientId: "ca-pub-1234567890123494",
      pathname: "/ko/relationship-tarot-questions",
    },
  ])(
    "loads AdSense after stored consent on allowlisted route $pathname",
    async ({ advertisingClientId, pathname }) => {
      navigationState.pathname = pathname;
      window.localStorage.setItem(
        getConsentStorageKey(),
        JSON.stringify({
          analytics: false,
          advertising: true,
        }),
      );

      renderConsent(undefined, "Product content", advertisingClientId);

      expect(
        await screen.findByRole("button", { name: "Privacy choices" }),
      ).toBeVisible();
      fireEvent.click(screen.getByRole("button", { name: "Privacy choices" }));
      expect(
        screen.getByRole("checkbox", { name: /Advertising/ }),
      ).toBeChecked();
      await waitFor(() => {
        expect(
          document.querySelector('script[src*="googlesyndication.com"]'),
        ).not.toBeNull();
      });
    },
  );

  it("tracks advertising across excluded-eligible-excluded navigation", async () => {
    const reloadDocument = vi.fn();
    const advertisingClientId = "ca-pub-1234567890123457";
    navigationState.pathname = "/share";
    window.localStorage.setItem(
      getConsentStorageKey(),
      JSON.stringify({
        analytics: false,
        advertising: true,
      }),
    );

    const { rerender } = renderConsent(
      reloadDocument,
      "First reading",
      advertisingClientId,
    );

    expect(
      await screen.findByRole("button", { name: "Privacy choices" }),
    ).toBeVisible();
    expect(
      document.querySelector('script[src*="googlesyndication.com"]'),
    ).toBeNull();
    expect(screen.getByRole("main")).toHaveTextContent("First reading");

    navigationState.pathname = "/relationship-flow";
    rerender(
      getConsentElement(
        reloadDocument,
        "Public content",
        advertisingClientId,
        "G-TEST1234",
      ),
    );
    await act(async () => {
      await Promise.resolve();
    });

    navigationState.pathname = "/ko/share";
    rerender(
      getConsentElement(
        reloadDocument,
        "Second reading",
        advertisingClientId,
        "G-TEST1234",
      ),
    );

    expect(screen.queryByText("Second reading")).toBeNull();
    expect(reloadDocument).toHaveBeenCalledOnce();
  });

  it("persists revocation and reloads already running services", async () => {
    const reloadDocument = vi.fn();
    window.localStorage.setItem(
      getConsentStorageKey(),
      JSON.stringify({
        analytics: true,
        advertising: false,
      }),
    );
    renderConsent(reloadDocument);

    fireEvent.click(
      await screen.findByRole("button", { name: "Privacy choices" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Analytics/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));

    expect(reloadDocument).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Privacy choices" }),
    ).not.toHaveFocus();
    expect(window.localStorage.getItem(getConsentStorageKey())).toContain(
      '"analytics":false',
    );
  });

  it("clears stale consent before reloading when revocation cannot be stored", async () => {
    const reloadDocument = vi.fn();
    window.localStorage.setItem(
      getConsentStorageKey(),
      JSON.stringify({ analytics: true, advertising: false }),
    );
    renderConsent(reloadDocument);

    fireEvent.click(
      await screen.findByRole("button", { name: "Privacy choices" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Analytics/ }));
    const setItem = vi
      .spyOn(window.localStorage, "setItem")
      .mockImplementation(() => {
        throw new DOMException("Storage unavailable", "QuotaExceededError");
      });
    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));

    expect(setItem).toHaveBeenCalled();
    expect(window.localStorage.getItem(getConsentStorageKey())).toBeNull();
    expect(reloadDocument).toHaveBeenCalledOnce();
    expect(
      (window as unknown as Record<string, boolean>)["ga-disable-G-TEST1234"],
    ).toBe(true);
  });

  it("bridges an active-service storage failure through session storage", async () => {
    const reloadDocument = vi.fn();
    window.localStorage.setItem(
      getConsentStorageKey(),
      JSON.stringify({ analytics: true, advertising: true }),
    );
    renderConsent(reloadDocument);

    fireEvent.click(
      await screen.findByRole("button", { name: "Privacy choices" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Analytics/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Advertising/ }));
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable", "QuotaExceededError");
    });
    vi.spyOn(window.localStorage, "removeItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable", "SecurityError");
    });
    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));

    expect(reloadDocument).toHaveBeenCalledOnce();
    expect(window.sessionStorage.getItem(failClosedSessionStorageKey)).toBe(
      "1",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(copy.storageError);
    expect(getGoogleScripts()).toHaveLength(0);
    expect(
      (window as unknown as Record<string, boolean>)["ga-disable-G-TEST1234"],
    ).toBe(true);
  });

  it("falls back to a scoped cookie when both Web Storage carriers fail", async () => {
    const reloadDocument = vi.fn();
    window.localStorage.setItem(
      getConsentStorageKey(),
      JSON.stringify({ analytics: true, advertising: true }),
    );
    renderConsent(reloadDocument);

    fireEvent.click(
      await screen.findByRole("button", { name: "Privacy choices" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Analytics/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Advertising/ }));
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable", "SecurityError");
    });
    vi.spyOn(window.localStorage, "removeItem").mockImplementation(() => {
      throw new DOMException("Storage unavailable", "SecurityError");
    });
    stubSessionStorage({
      setItem() {
        throw new DOMException("Storage unavailable", "SecurityError");
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));

    expect(reloadDocument).toHaveBeenCalledOnce();
    expect(document.cookie).toContain(`${failClosedCookieName}=1`);
    expect(screen.getByRole("alert")).toBeVisible();
    expect(getGoogleScripts()).toHaveLength(0);
  });

  it("blocks app navigation until a carrierless storage failure is repaired", async () => {
    const reloadDocument = vi.fn();
    window.localStorage.setItem(
      getConsentStorageKey(),
      JSON.stringify({ analytics: true, advertising: true }),
    );
    const { rerender } = renderConsent(reloadDocument);

    fireEvent.click(
      await screen.findByRole("button", { name: "Privacy choices" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Analytics/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Advertising/ }));
    const setItem = vi
      .spyOn(window.localStorage, "setItem")
      .mockImplementation(() => {
        throw new DOMException("Storage unavailable", "SecurityError");
      });
    const removeItem = vi
      .spyOn(window.localStorage, "removeItem")
      .mockImplementation(() => {
        throw new DOMException("Storage unavailable", "SecurityError");
      });
    stubSessionStorage({
      setItem() {
        throw new DOMException("Storage unavailable", "SecurityError");
      },
    });
    const cookieSetter = vi
      .spyOn(Document.prototype, "cookie", "set")
      .mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));

    expect(reloadDocument).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(copy.storageError);
    expect(
      screen.getByRole("heading", { name: "Optional privacy choices" }),
    ).toBeVisible();
    expect(getGoogleScripts()).toHaveLength(0);
    expect(
      (window as unknown as Record<string, boolean>)["ga-disable-G-TEST1234"],
    ).toBe(true);

    const link = document.createElement("a");
    link.href = "/share";
    document.body.append(link);
    const linkClick = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    expect(link.dispatchEvent(linkClick)).toBe(false);

    const form = document.createElement("form");
    form.action = "/share";
    document.body.append(form);
    const formSubmit = new SubmitEvent("submit", {
      bubbles: true,
      cancelable: true,
    });
    expect(form.dispatchEvent(formSubmit)).toBe(false);

    navigationState.pathname = "/share";
    rerender(
      getConsentElement(
        reloadDocument,
        "Excluded content",
        "ca-pub-1234567890123456",
        "G-TEST1234",
      ),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(reloadDocument).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeVisible();
    expect(screen.queryByText("Excluded content")).not.toBeInTheDocument();

    setItem.mockRestore();
    removeItem.mockRestore();
    restoreSessionStorage();
    cookieSetter.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));

    expect(window.localStorage.getItem(getConsentStorageKey())).toContain(
      '"analytics":false',
    );
    expect(reloadDocument).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps retry fail-closed until its session marker is verifiably cleared", async () => {
    const reloadDocument = vi.fn();
    window.localStorage.setItem(
      getConsentStorageKey(),
      JSON.stringify({ analytics: true, advertising: true }),
    );
    window.sessionStorage.setItem(failClosedSessionStorageKey, "1");
    renderConsent(reloadDocument);

    expect(await screen.findByRole("alert")).toBeVisible();
    stubSessionStorage({
      removeItem() {
        throw new DOMException("Storage unavailable", "SecurityError");
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));

    expect(screen.getByRole("alert")).toBeVisible();
    expect(window.sessionStorage.getItem(failClosedSessionStorageKey)).toBe(
      "1",
    );
    expect(getGoogleScripts()).toHaveLength(0);
    expect(reloadDocument).not.toHaveBeenCalled();

    restoreSessionStorage();
    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));

    expect(
      window.sessionStorage.getItem(failClosedSessionStorageKey),
    ).toBeNull();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(getGoogleScripts()).toHaveLength(0);
  });

  it("does not enable analytics when a settings choice cannot be stored", async () => {
    const reloadDocument = vi.fn();
    renderConsent(reloadDocument);
    fireEvent.click(
      await screen.findByRole("button", { name: "Privacy choices" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Analytics/ }));
    const setItem = vi
      .spyOn(window.localStorage, "setItem")
      .mockImplementation(() => {
        throw new DOMException("Storage unavailable", "QuotaExceededError");
      });
    const removeItem = vi
      .spyOn(window.localStorage, "removeItem")
      .mockImplementation(() => {
        throw new DOMException("Storage unavailable", "SecurityError");
      });
    fireEvent.click(screen.getByRole("button", { name: "Save choices" }));

    expect(setItem).toHaveBeenCalled();
    expect(removeItem).toHaveBeenCalled();
    expect(reloadDocument).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(copy.storageError);
    expect(
      screen.getByRole("heading", { name: "Optional privacy choices" }),
    ).toHaveFocus();
    expect(getGoogleScripts()).toHaveLength(0);
  });
});

function renderConsent(
  reloadDocument?: () => void,
  content = "Product content",
  advertisingClientId = "ca-pub-1234567890123456",
  analyticsMeasurementId = "G-TEST1234",
) {
  return render(
    getConsentElement(
      reloadDocument,
      content,
      advertisingClientId,
      analyticsMeasurementId,
    ),
  );
}

function getConsentElement(
  reloadDocument?: () => void,
  content = "Product content",
  advertisingClientId?: string,
  analyticsMeasurementId?: string,
  defaultPreferences?: {
    readonly analytics: boolean;
    readonly advertising: boolean;
  },
) {
  return (
    <PrivacyConsent
      advertisingClientId={advertisingClientId}
      analyticsMeasurementId={analyticsMeasurementId}
      copy={copy}
      defaultPreferences={defaultPreferences}
      reloadDocument={reloadDocument}
    >
      <main>{content}</main>
      <SiteFooter ariaLabel="Page navigation" links={[]} />
    </PrivacyConsent>
  );
}

function getGoogleScripts() {
  return [
    ...document.querySelectorAll(
      'script[src*="googletagmanager.com"], script[src*="googlesyndication.com"]',
    ),
  ];
}

function setStoredRejection() {
  window.localStorage.setItem(
    getConsentStorageKey(),
    JSON.stringify({
      analytics: false,
      advertising: false,
    }),
  );
}

function getConsentStorageKey() {
  return "tarot-spark.optional-services-consent";
}

function stubSessionStorage(overrides: Partial<Storage>) {
  const storage = window.sessionStorage;
  const stub: Storage = {
    get length() {
      return storage.length;
    },
    clear: () => storage.clear(),
    getItem: (key) => storage.getItem(key),
    key: (index) => storage.key(index),
    removeItem: (key) => storage.removeItem(key),
    setItem: (key, value) => storage.setItem(key, value),
    ...overrides,
  };

  Object.defineProperty(window, "sessionStorage", {
    configurable: true,
    value: stub,
  });
}

function restoreSessionStorage() {
  if (sessionStorageDescriptor) {
    Object.defineProperty(window, "sessionStorage", sessionStorageDescriptor);
  }
}
