import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getReadingAttributionFromUrl,
  shareCampaignIds,
  shareSourceIds,
} from "@/features/tarot-reading/reading-state";
import {
  AttributionLink,
  AttributionNavigationScript,
} from "./AttributionLink";

const current = vi.hoisted(() => ({
  query: "",
  suspended: false,
  pending: new Promise<never>(() => {}),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => {
    if (current.suspended) throw current.pending;
    return new URLSearchParams(current.query);
  },
}));

describe("AttributionLink", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
    current.query = "";
    current.suspended = false;
  });

  it.each([
    "source=youtube&campaign=profile&context=private-input",
    "utm_source=youtube&utm_campaign=profile&utm_medium=channel",
  ])(
    "keeps only the complete pair across internal content links: %s",
    (query) => {
      current.query = query;
      render(
        <AttributionLink href="/ko?spread=quick#reading">Read</AttributionLink>,
      );
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/ko?spread=quick&source=youtube&campaign=profile#reading",
      );
    },
  );

  it.each([
    "",
    "source=youtube",
    "source=youtube&source=threads&campaign=profile",
    "source=unknown&campaign=profile&utm_source=youtube&utm_campaign=profile",
    "utm_source=youtube&utm_campaign=profile&utm_campaign=demo",
  ])(
    "does not invent attribution for a fresh or invalid entry: %s",
    (query) => {
      current.query = query;
      render(<AttributionLink href="/ko/daily">Daily</AttributionLink>);
      expect(screen.getByRole("link")).toHaveAttribute("href", "/ko/daily");
    },
  );

  it.each([
    "/ko?source=reddit&campaign=demo",
    "/ko?source=reddit",
    "/ko?source=unknown&campaign=demo",
    "/ko?source=reddit&source=copy&campaign=demo",
    "/ko?utm_source=reddit&utm_campaign=demo",
    "/ko?utm_medium=channel",
    "https://example.com/",
    "//example.com",
    "//tarot-spark.local",
    "/\\example.com",
    "#reading",
  ])(
    "preserves explicit target values and non-local navigation: %s",
    (href) => {
      current.query = "source=youtube&campaign=profile";
      render(<AttributionLink href={href}>Read</AttributionLink>);
      expect(screen.getByRole("link")).toHaveAttribute("href", href);
    },
  );

  it("uses fresh attribution when the query reader is not ready", () => {
    current.suspended = true;
    const calls: string[] = [];
    const navigate = vi.fn(() => calls.push("navigate"));
    render(
      <AttributionLink href="/ko" onClick={() => calls.push("caller")}>
        Read
      </AttributionLink>,
    );
    const link = screen.getByRole("link");
    vi.stubGlobal("window", {
      location: {
        search: "?source=threads&campaign=profile&context=private",
        assign: navigate,
      },
    });
    fireEvent.click(link);
    expect(link).toHaveAttribute("href", "/ko?source=threads&campaign=profile");
    expect(navigate).toHaveBeenCalledWith(
      "/ko?source=threads&campaign=profile",
    );
    expect(calls).toEqual(["caller", "navigate"]);
  });

  it("honors a canceled caller before stale-query navigation", () => {
    current.suspended = true;
    const navigate = vi.fn();
    render(
      <AttributionLink href="/ko" onClick={(event) => event.preventDefault()}>
        Read
      </AttributionLink>,
    );
    vi.stubGlobal("window", {
      location: {
        search: "?source=threads&campaign=profile",
        assign: navigate,
      },
    });
    fireEvent.click(screen.getByRole("link"));
    expect(navigate).not.toHaveBeenCalled();
  });

  it("updates with the current route and preserves the anchor ref and callback", () => {
    current.query = "source=youtube&campaign=profile";
    const ref = createRef<HTMLAnchorElement>();
    const clicked = vi.fn();
    const link = (
      <AttributionLink
        href="/how-to-ask-tarot-questions"
        onClick={(event) => {
          event.preventDefault();
          clicked(event.ctrlKey);
        }}
        ref={ref}
      >
        Guide
      </AttributionLink>
    );
    const { rerender } = render(link);
    const anchor = screen.getByRole("link");
    expect(ref.current).toBe(anchor);
    fireEvent.click(anchor, { ctrlKey: true });
    expect(clicked).toHaveBeenCalledWith(true);
    current.query = "";
    rerender(
      <AttributionLink href="/how-to-ask-tarot-questions">
        Guide
      </AttributionLink>,
    );
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/how-to-ask-tarot-questions",
    );
  });
});

describe("native attribution navigation", () => {
  afterEach(cleanup);

  const queries = [
    ...shareSourceIds.flatMap((source) =>
      shareCampaignIds.map(
        (campaign) => `source=${source}&campaign=${campaign}`,
      ),
    ),
    "utm_source=threads&utm_campaign=profile&utm_medium=social&context=private",
    "source=copy&campaign=demo&utm_source=threads&utm_campaign=profile",
    "",
    "source=threads",
    "campaign=profile",
    "source=threads&source=copy&campaign=profile",
    "source=threads&campaign=profile&campaign=demo",
    "source=unknown&campaign=profile&utm_source=threads&utm_campaign=profile",
    "source=&campaign=profile&utm_source=threads&utm_campaign=profile",
    "utm_source=threads&utm_campaign=profile&utm_campaign=demo",
    "utm_source=threads",
    "utm_medium=social&context=private",
  ];

  it.each(queries)(
    "matches the canonical parser for native navigation: %s",
    (query) => {
      const { dispatch, link } = nativeLink(query);
      const attribution = getReadingAttributionFromUrl(
        `https://example.com/?${query}`,
      );
      dispatch();
      expect(link.getAttribute("href")).toBe(
        attribution
          ? `/ko?spread=quick&source=${attribution.sourceId}&campaign=${attribution.campaignId}#reading`
          : "/ko?spread=quick#reading",
      );
    },
  );

  it.each([
    "/ko?source=copy&campaign=demo",
    "/ko?source=copy",
    "/ko?utm_medium=social",
    "https://example.com/",
    "//tarot-spark.local",
    "/\\example.com",
    "#reading",
  ])("preserves explicit and non-local targets: %s", (href) => {
    const { dispatch, link } = nativeLink(
      "source=threads&campaign=profile",
      href,
    );
    dispatch();
    expect(link.getAttribute("href")).toBe(href);
  });

  it("respects cancellation and unmarked links, retaining fresh-visit behavior", () => {
    const { dispatch, link, location, listeners } = nativeLink(
      "source=threads&campaign=profile",
    );
    expect([...listeners.keys()]).toEqual(["click", "auxclick", "contextmenu"]);
    dispatch(true);
    expect(link.getAttribute("href")).toBe("/ko?spread=quick#reading");
    dispatch(false, "contextmenu");
    expect(link.getAttribute("href")).toContain(
      "source=threads&campaign=profile",
    );
    location.href = "https://example.com/guide";
    dispatch(false, "auxclick");
    expect(link.getAttribute("href")).toBe("/ko?spread=quick#reading");
    link.removeAttribute("data-attribution-href");
    location.href = "https://example.com/guide?source=copy&campaign=demo";
    dispatch();
    expect(link.getAttribute("href")).toBe("/ko?spread=quick#reading");
  });
});

function nativeLink(query: string, href = "/ko?spread=quick#reading") {
  render(<AttributionNavigationScript />);
  const source = document.getElementById("attribution-navigation")?.textContent;
  expect(source).toBeTruthy();
  const listeners = new Map<string, EventListener>();
  const location = { href: `https://example.com/guide?${query}` };
  new Function(
    "document",
    "window",
    "Element",
    "HTMLAnchorElement",
    source ?? "",
  )(
    {
      addEventListener: (name: string, listener: EventListener) =>
        listeners.set(name, listener),
    },
    { location },
    Element,
    HTMLAnchorElement,
  );
  const link = document.createElement("a");
  link.setAttribute("href", href);
  link.setAttribute("data-attribution-href", href);
  const child = link.appendChild(document.createElement("span"));
  return {
    link,
    location,
    listeners,
    dispatch(defaultPrevented = false, type = "click") {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "target", { value: child });
      if (defaultPrevented) event.preventDefault();
      listeners.get(type)?.(event);
      expect(event.defaultPrevented).toBe(defaultPrevented);
    },
  };
}
