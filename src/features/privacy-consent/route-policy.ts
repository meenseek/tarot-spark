const advertisingEligiblePathnames = new Set([
  "/relationship-flow",
  "/ko/relationship-flow",
  "/relationship-tarot-questions",
  "/ko/relationship-tarot-questions",
]);

export function isAdvertisingEligiblePathname(pathname: string) {
  return advertisingEligiblePathnames.has(pathname);
}
