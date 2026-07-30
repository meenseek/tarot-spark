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
import { PrivacyConsent } from "./PrivacyConsent";

const navigationState = vi.hoisted(() => ({
  pathname: "/relationship-flow",
}));

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
  rejectOptional: "Reject optional services",
  settingsButton: "Privacy choices",
} as const;

describe("PrivacyConsent", () => {
  afterEach(() => {
    cleanup();
    navigationState.pathname = "/relationship-flow";
    window.localStorage.clear();
    document
      .querySelectorAll(
        'script[src*="googletagmanager.com"], script[src*="googlesyndication.com"]',
      )
      .forEach((element) => element.remove());
  });

  it("loads no optional script before the first choice", async () => {
    renderConsent();

    expect(
      await screen.findByRole("heading", {
        name: "Optional privacy choices",
      }),
    ).toBeInTheDocument();
    expect(getGoogleScripts()).toHaveLength(0);
  });

  it("loads only explicitly selected services and allows revision", async () => {
    renderConsent();

    fireEvent.click(await screen.findByRole("checkbox", { name: /Analytics/ }));
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
  });

  it("persists an explicit rejection without loading optional scripts", async () => {
    renderConsent();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Reject optional services",
      }),
    );

    expect(getGoogleScripts()).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Privacy choices" }),
    ).toBeVisible();
    expect(window.localStorage.getItem(getConsentStorageKey())).toContain(
      '"analytics":false',
    );
  });

  it("hydrates stored choices under React strict effects", async () => {
    window.localStorage.setItem(
      getConsentStorageKey(),
      JSON.stringify({
        version: 1,
        analytics: false,
        advertising: false,
      }),
    );

    render(<StrictMode>{getConsentElement()}</StrictMode>);

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
  ])("never loads AdSense on non-allowlisted route %s", async (pathname) => {
    navigationState.pathname = pathname;
    window.localStorage.setItem(
      getConsentStorageKey(),
      JSON.stringify({
        version: 1,
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
  ])(
    "loads AdSense after stored consent on allowlisted route $pathname",
    async ({ advertisingClientId, pathname }) => {
      navigationState.pathname = pathname;
      window.localStorage.setItem(
        getConsentStorageKey(),
        JSON.stringify({
          version: 1,
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
        version: 1,
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
      getConsentElement(reloadDocument, "Public content", advertisingClientId),
    );
    await act(async () => {
      await Promise.resolve();
    });

    navigationState.pathname = "/ko/share";
    rerender(
      getConsentElement(reloadDocument, "Second reading", advertisingClientId),
    );

    expect(screen.queryByText("Second reading")).toBeNull();
    expect(reloadDocument).toHaveBeenCalledOnce();
  });

  it("persists revocation and reloads already running services", async () => {
    const reloadDocument = vi.fn();
    window.localStorage.setItem(
      getConsentStorageKey(),
      JSON.stringify({
        version: 1,
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
    expect(window.localStorage.getItem(getConsentStorageKey())).toContain(
      '"analytics":false',
    );
  });
});

function renderConsent(
  reloadDocument?: () => void,
  content = "Product content",
  advertisingClientId = "ca-pub-1234567890123456",
) {
  return render(
    getConsentElement(reloadDocument, content, advertisingClientId),
  );
}

function getConsentElement(
  reloadDocument?: () => void,
  content = "Product content",
  advertisingClientId = "ca-pub-1234567890123456",
) {
  return (
    <PrivacyConsent
      advertisingClientId={advertisingClientId}
      analyticsMeasurementId="G-TEST1234"
      copy={copy}
      reloadDocument={reloadDocument}
    >
      <main>{content}</main>
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

function getConsentStorageKey() {
  return "tarot-spark.optional-services-consent.v1";
}
