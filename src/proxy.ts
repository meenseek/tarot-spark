import { NextResponse, type NextRequest } from "next/server";
import { isDailyQuestionPathSegment } from "@/features/daily-question/paths";
import { isPublicPageId } from "@/features/public-pages/ids";
import { defaultLocale, isLocale, isPrefixedLocale } from "@/i18n/config";

export function proxy(request: NextRequest) {
  const pathSegments = request.nextUrl.pathname.split("/").filter(Boolean);
  const [firstSegment, secondSegment, thirdSegment] = pathSegments;

  if (!firstSegment) {
    return NextResponse.next();
  }

  if (firstSegment === defaultLocale) {
    return notFoundResponse();
  }

  if (isLocaleLike(firstSegment) && !isLocale(firstSegment)) {
    return notFoundResponse();
  }

  if (!isPrefixedLocale(firstSegment)) {
    return NextResponse.next();
  }

  if (!secondSegment) {
    return NextResponse.next();
  }

  if (
    (!isPublicPageId(secondSegment) &&
      !isDailyQuestionPathSegment(secondSegment)) ||
    thirdSegment
  ) {
    return notFoundResponse();
  }

  return NextResponse.next();
}

function isLocaleLike(segment: string) {
  return /^[a-z]{2}$/.test(segment);
}

function notFoundResponse() {
  return new NextResponse("Not Found", { status: 404 });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
