import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const originalClientId = process.env["NEXT_PUBLIC_ADSENSE_CLIENT_ID"];

describe("GET /ads.txt", () => {
  afterEach(() => {
    restoreEnvironmentVariable(
      "NEXT_PUBLIC_ADSENSE_CLIENT_ID",
      originalClientId,
    );
  });

  it("serves the Google authorized seller record", async () => {
    process.env["NEXT_PUBLIC_ADSENSE_CLIENT_ID"] = "ca-pub-1234567890123456";

    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8",
    );
    await expect(response.text()).resolves.toBe(
      "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n",
    );
  });

  it("returns 404 when AdSense is not configured", async () => {
    Reflect.deleteProperty(process.env, "NEXT_PUBLIC_ADSENSE_CLIENT_ID");

    const response = GET();

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Not found\n");
  });
});

function restoreEnvironmentVariable(key: string, value: string | undefined) {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, key);
    return;
  }

  process.env[key] = value;
}
