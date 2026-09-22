import { describe, expect, it } from "vitest";
import { isPublicPagePath, loginHref } from "@/lib/access";

describe("guest access", () => {
  it("opens only the browsing and draw pages", () => {
    for (const path of ["/", "/login", "/discover", "/place/abc", "/food/abc", "/share/token"]) {
      expect(isPublicPagePath(path)).toBe(true);
    }
    for (const path of ["/record", "/me", "/api/share", "/records"]) {
      expect(isPublicPagePath(path)).toBe(false);
    }
  });

  it("preserves the destination when asking for login", () => {
    expect(loginHref("/record")).toBe("/login?next=%2Frecord");
  });
});
