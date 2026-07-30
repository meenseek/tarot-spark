const advertisingEligiblePathnames = new Set([
  "/relationship-flow",
  "/ko/relationship-flow",
]);

export function isAdvertisingEligiblePathname(pathname: string) {
  return advertisingEligiblePathnames.has(pathname);
}
