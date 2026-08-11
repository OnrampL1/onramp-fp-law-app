import { chunkContractText } from "./chunking";

describe("chunkContractText", () => {
  it("splits on ARTICLE headings and packs each section into its own chunk", () => {
    const text = [
      "ARTICLE I Purpose",
      "",
      "Vendor shall provide services as described in the Statement of Work attached hereto.",
      "",
      "ARTICLE II Payment",
      "",
      "Client shall pay Vendor within 30 days of invoice receipt.",
      "",
      "ARTICLE III Termination",
      "",
      "Either party may terminate this Agreement upon 30 days written notice.",
    ].join("\n");

    const chunks = chunkContractText(text);

    expect(chunks).toHaveLength(3);
    expect(chunks.map((c) => c.headingPath)).toEqual([
      "ARTICLE I Purpose",
      "ARTICLE II Payment",
      "ARTICLE III Termination",
    ]);
    expect(chunks.map((c) => c.chunkIndex)).toEqual([0, 1, 2]);
    expect(chunks[1].content).toContain("Client shall pay Vendor");
  });

  it("recognizes numbered headings without the ARTICLE/SECTION keyword", () => {
    const text = [
      "9.4 Limitation of Liability",
      "",
      "Neither party's liability shall exceed fees paid in the preceding twelve months.",
    ].join("\n");

    const chunks = chunkContractText(text);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].headingPath).toBe("9.4 Limitation of Liability");
  });

  it("falls back to paragraph packing with a null heading when no heading is detected", () => {
    const text = [
      "This is the first paragraph of a contract with no legal headings at all.",
      "",
      "This is the second paragraph, still with no heading above it anywhere.",
    ].join("\n");

    const chunks = chunkContractText(text);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].headingPath).toBeNull();
    expect(chunks[0].content).toContain("first paragraph");
    expect(chunks[0].content).toContain("second paragraph");
  });

  it("does not misdetect an ordinary numbered list item in body text as a heading", () => {
    // Lowercase-leading continuation lines should never match the numbered
    // heading pattern (it requires a capitalized word after the number).
    const text = ["1. this is not a heading, just a numbered list item in prose."].join(
      "\n",
    );

    const chunks = chunkContractText(text);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].headingPath).toBeNull();
  });

  it("splits a single paragraph that exceeds the max chunk size, with overlap between pieces", () => {
    // "failure to perform " is 20 chars; 250 repeats = 5000 chars, well
    // past MAX_CHUNK_TOKENS (800) * CHARS_PER_TOKEN (4) = 3200.
    const hugeParagraph = "failure to perform ".repeat(250).trim();

    const chunks = chunkContractText(hugeParagraph);

    expect(chunks.length).toBeGreaterThan(1);

    // chunkIndex must be sequential across the split pieces.
    expect(chunks.map((c) => c.chunkIndex)).toEqual(
      chunks.map((_, i) => i),
    );

    // Consecutive pieces must overlap: the tail of one chunk equals the
    // head of the next (splitWithOverlap's whole reason for existing —
    // losing context at a hard cut is worse than a bit of duplication).
    const maxChars = 800 * 4;
    const overlapChars = Math.floor(maxChars * 0.15);
    for (let i = 0; i < chunks.length - 1; i++) {
      const tailOfCurrent = chunks[i].content.slice(-overlapChars);
      const headOfNext = chunks[i + 1].content.slice(0, overlapChars);
      expect(tailOfCurrent).toBe(headOfNext);
    }
  });

  it("returns no chunks for empty or whitespace-only text", () => {
    expect(chunkContractText("")).toEqual([]);
    expect(chunkContractText("   \n\n   ")).toEqual([]);
  });

  it("assigns a globally sequential chunkIndex across multiple headed sections", () => {
    const sections = Array.from(
      { length: 5 },
      (_, i) => `ARTICLE ${i + 1}\n\nContent for section number ${i + 1}.`,
    ).join("\n\n");

    const chunks = chunkContractText(sections);

    expect(chunks.map((c) => c.chunkIndex)).toEqual([0, 1, 2, 3, 4]);
  });
});
