import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GoogleAdSenseAccountMetadata } from "./GoogleAdSense";
import { GoogleAdSenseScript } from "./GoogleAdSenseScript";
import {
  getGoogleAdSenseClientId,
  getGoogleAdSensePublisherId,
} from "./config";

const originalClientId = process.env["NEXT_PUBLIC_ADSENSE_CLIENT_ID"];

describe("GoogleAdSense", () => {
  beforeEach(() => {
    clearGoogleAdSenseHeadElements();
  });

  afterEach(() => {
    cleanup();
    clearGoogleAdSenseHeadElements();
    restoreEnvironmentVariable(
      "NEXT_PUBLIC_ADSENSE_CLIENT_ID",
      originalClientId,
    );
  });

  it("renders account metadata without loading the advertising script", () => {
    process.env["NEXT_PUBLIC_ADSENSE_CLIENT_ID"] = "ca-pub-1234567890123456";

    render(<GoogleAdSenseAccountMetadata />);

    expect(
      document.head.querySelector('meta[name="google-adsense-account"]'),
    ).toHaveAttribute("content", "ca-pub-1234567890123456");
    expect(
      document.head.querySelector(
        'script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
      ),
    ).toBeNull();
  });

  it("renders the advertising script only when its gated component mounts", () => {
    render(<GoogleAdSenseScript clientId="ca-pub-1234567890123456" />);

    const script = document.querySelector(
      'script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
    );
    expect(script).toHaveAttribute(
      "src",
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456",
    );
    expect(script).toHaveAttribute("crossorigin", "anonymous");
    expect(script).toHaveAttribute("async");
  });

  it("fails closed when the client id is missing or malformed", () => {
    process.env["NEXT_PUBLIC_ADSENSE_CLIENT_ID"] = "pub-invalid";

    render(<GoogleAdSenseAccountMetadata />);

    expect(
      document.head.querySelector('meta[name="google-adsense-account"]'),
    ).toBeNull();
    expect(
      document.head.querySelector(
        'script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
      ),
    ).toBeNull();
    expect(getGoogleAdSenseClientId()).toBeNull();
    expect(getGoogleAdSensePublisherId()).toBeNull();
  });

  it("derives the ads.txt publisher id from the client id", () => {
    process.env["NEXT_PUBLIC_ADSENSE_CLIENT_ID"] = "ca-pub-1234567890123456";

    expect(getGoogleAdSensePublisherId()).toBe("pub-1234567890123456");
  });
});

function clearGoogleAdSenseHeadElements() {
  document.head
    .querySelectorAll(
      'meta[name="google-adsense-account"], script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
    )
    .forEach((element) => element.remove());
}

function restoreEnvironmentVariable(key: string, value: string | undefined) {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, key);
    return;
  }

  process.env[key] = value;
}
