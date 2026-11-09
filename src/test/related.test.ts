import { describe, it, expect } from "vitest";
import { pickNeighbours } from "../../api/_related.js";

const post = (d: string) => ({ created_at: `2026-01-${d}T00:00:00Z` });

describe("pickNeighbours", () => {
  it("takes the closest posts on both sides, newest first", () => {
    const newer = [post("11"), post("12"), post("13"), post("14")];
    const older = [post("09"), post("08"), post("07"), post("06")];
    expect(pickNeighbours(newer, older, 4).map((p) => p.created_at.slice(8, 10))).toEqual([
      "12",
      "11",
      "09",
      "08",
    ]);
  });

  it("fills from the other side at the ends of a category", () => {
    const older = [post("09"), post("08"), post("07")];
    expect(pickNeighbours([], older, 2)).toHaveLength(2);
    expect(pickNeighbours([post("11")], older, 6)).toHaveLength(4);
  });
});
