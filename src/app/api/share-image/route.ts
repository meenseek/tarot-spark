import { getShareImageResponse } from "./image";

export const runtime = "nodejs";

export function GET(request: Request) {
  return getShareImageResponse(request);
}
