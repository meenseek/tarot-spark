import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleAdSenseAccountMetadata } from "./GoogleAdSense";
import { GoogleAdSenseScript } from "./GoogleAdSenseScript";
import {
  getGoogleAdSenseClientId,
  getGoogleAdSensePublisherId,
  getGoogleAdSenseScriptClientId,
} from "./config";

const originalClientId = process.env["NEXT_PUBLIC_ADSENSE_CLIENT_ID"];
const originalScriptEnabled = process.env["NEXT_PUBLIC_ADSENSE_SCRIPT_ENABLED"];

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
    restoreEnvironmentVariable(
      "NEXT_PUBLIC_ADSENSE_SCRIPT_ENABLED",
      originalScriptEnabled,
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
    const onScriptMount = vi.fn();

    render(
      <GoogleAdSenseScript
        clientId="ca-pub-1234567890123456"
        onScriptMount={onScriptMount}
      />,
    );

    const script = document.querySelector(
      'script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
    );
    expect(script).toHaveAttribute(
      "src",
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456",
    );
    expect(script).toHaveAttribute("crossorigin", "anonymous");
    expect(script).toHaveAttribute("async");
    expect(onScriptMount).toHaveBeenCalledOnce();
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

  it("keeps script delivery off by default without hiding account metadata", () => {
    process.env["NEXT_PUBLIC_ADSENSE_CLIENT_ID"] = "ca-pub-1234567890123456";
    Reflect.deleteProperty(process.env, "NEXT_PUBLIC_ADSENSE_SCRIPT_ENABLED");

    expect(getGoogleAdSenseClientId()).toBe("ca-pub-1234567890123456");
    expect(getGoogleAdSensePublisherId()).toBe("pub-1234567890123456");
    expect(getGoogleAdSenseScriptClientId()).toBeNull();
  });

  it.each([undefined, "false", "TRUE", "1", " true "])(
    "fails closed for script flag %s",
    (scriptEnabled) => {
      process.env["NEXT_PUBLIC_ADSENSE_CLIENT_ID"] = "ca-pub-1234567890123456";

      if (scriptEnabled === undefined) {
        Reflect.deleteProperty(
          process.env,
          "NEXT_PUBLIC_ADSENSE_SCRIPT_ENABLED",
        );
      } else {
        process.env["NEXT_PUBLIC_ADSENSE_SCRIPT_ENABLED"] = scriptEnabled;
      }

      expect(getGoogleAdSenseScriptClientId()).toBeNull();
    },
  );

  it("enables script delivery only with an explicit flag and valid client id", () => {
    process.env["NEXT_PUBLIC_ADSENSE_CLIENT_ID"] = "ca-pub-1234567890123456";
    process.env["NEXT_PUBLIC_ADSENSE_SCRIPT_ENABLED"] = "true";

    expect(getGoogleAdSenseScriptClientId()).toBe("ca-pub-1234567890123456");

    process.env["NEXT_PUBLIC_ADSENSE_CLIENT_ID"] = "pub-invalid";

    expect(getGoogleAdSenseScriptClientId()).toBeNull();
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
