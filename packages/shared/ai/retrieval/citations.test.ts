import { verifyCitations, type CitedSource } from "./citations";
import type { RetrievedChunk } from "./search";

function chunk(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    chunkIndex: 0,
    headingPath: null,
    content:
      "The Vendor's liability under this Agreement shall be unlimited for any breach.",
    score: 1,
    ...overrides,
  };
}

describe("verifyCitations", () => {
  it("accepts an excerpt that is an exact substring of the cited chunk", () => {
    const retrieved = [chunk()];
    const sources: CitedSource[] = [
      { chunkId: retrieved[0].id, excerpt: "shall be unlimited for any breach" },
    ];

    const result = verifyCitations(sources, retrieved);

    expect(result.valid).toBe(true);
    expect(result.invalidSources).toEqual([]);
  });

  it("accepts an excerpt that only differs by whitespace and case", () => {
    const retrieved = [chunk()];
    const sources: CitedSource[] = [
      {
        chunkId: retrieved[0].id,
        excerpt: "SHALL   BE\nunlimited for any breach",
      },
    ];

    expect(verifyCitations(sources, retrieved).valid).toBe(true);
  });

  it("rejects an excerpt that does not appear in the cited chunk", () => {
    const retrieved = [chunk()];
    const sources: CitedSource[] = [
      {
        chunkId: retrieved[0].id,
        excerpt: "liability is capped at fees paid in the last 12 months",
      },
    ];

    const result = verifyCitations(sources, retrieved);

    expect(result.valid).toBe(false);
    expect(result.invalidSources).toEqual(sources);
    expect(result.reason).toMatch(/1 of 1/);
  });

  it("rejects a citation whose chunkId was never actually retrieved", () => {
    const retrieved = [chunk()];
    const sources: CitedSource[] = [
      {
        chunkId: "99999999-9999-9999-9999-999999999999",
        excerpt: "shall be unlimited for any breach",
      },
    ];

    const result = verifyCitations(sources, retrieved);

    expect(result.valid).toBe(false);
    expect(result.invalidSources).toEqual(sources);
  });

  it("rejects an empty excerpt rather than treating it as vacuously true", () => {
    const retrieved = [chunk()];
    const sources: CitedSource[] = [{ chunkId: retrieved[0].id, excerpt: "   " }];

    expect(verifyCitations(sources, retrieved).valid).toBe(false);
  });

  it("reports only the invalid sources when a mix of valid and invalid citations is given", () => {
    const chunkA = chunk({
      id: "11111111-1111-1111-1111-111111111111",
      content: "Termination requires 30 days written notice.",
    });
    const chunkB = chunk({
      id: "22222222-2222-2222-2222-222222222222",
      content: "Payment is due within 15 days of invoice.",
    });
    const sources: CitedSource[] = [
      { chunkId: chunkA.id, excerpt: "30 days written notice" },
      { chunkId: chunkB.id, excerpt: "due within 60 days" }, // wrong number, not in source
    ];

    const result = verifyCitations(sources, [chunkA, chunkB]);

    expect(result.valid).toBe(false);
    expect(result.invalidSources).toEqual([sources[1]]);
    expect(result.reason).toMatch(/1 of 2/);
  });

  it("returns valid for an empty sources array", () => {
    const result = verifyCitations([], [chunk()]);

    expect(result.valid).toBe(true);
    expect(result.invalidSources).toEqual([]);
    expect(result.reason).toBeUndefined();
  });

  it("accepts an excerpt that differs from the source only by whitespace before punctuation", () => {
    const retrieved = [
      chunk({
        content: "والغاء العقد مع طلب التعويض . وفي هذه الحالة يحق للفريق الآخر.",
      }),
    ];
    const sources: CitedSource[] = [
      { chunkId: retrieved[0].id, excerpt: "والغاء العقد مع طلب التعويض." },
    ];

    expect(verifyCitations(sources, retrieved).valid).toBe(true);
  });

  it("accepts an excerpt that differs from the source only by alef-hamza orthographic variance", () => {
    const retrieved = [
      chunk({
        content: "يمكن حل العقد قبل حلول أجله بسبب إذا انتهت المدة أو لسبب آخر.",
      }),
    ];
    const sources: CitedSource[] = [
      {
        chunkId: retrieved[0].id,
        excerpt: "يمكن حل العقد قبل حلول اجله بسبب اذا انتهت المدة او لسبب اخر.",
      },
    ];

    expect(verifyCitations(sources, retrieved).valid).toBe(true);
  });

  it("still rejects a genuinely reworded/paraphrased excerpt after normalization", () => {
    // Same subject matter and vocabulary as a real near-miss case, but the
    // clause order and connectors are actually different — normalization
    // must not paper over a real paraphrase, only representation artifacts.
    const retrieved = [
      chunk({
        content:
          "على ان العقد لا يلغى حتما في هذه الحالة. فان الفريق الذي لم تنفذ حقوقه يستطيع ان يطالب بالتنفيذ.",
      }),
    ];
    const sources: CitedSource[] = [
      {
        chunkId: retrieved[0].id,
        excerpt:
          "لكن، في هذه الحالة، العقد لا يلغى حتمًا. فإن الفريق الذي لم تُنفذ حقوقه...",
      },
    ];

    const result = verifyCitations(sources, retrieved);

    expect(result.valid).toBe(false);
    expect(result.invalidSources).toEqual(sources);
  });

  it("still rejects an excerpt whose content is simply not present, even after normalization", () => {
    const retrieved = [
      chunk({ content: "أجرة العمل تستحق شهريا او كما اتفق عليه الفريقان." }),
    ];
    const sources: CitedSource[] = [
      {
        chunkId: retrieved[0].id,
        excerpt: "اجرة العمل تستحق فورا عند انتهاء الخدمة مباشرة.",
      },
    ];

    expect(verifyCitations(sources, retrieved).valid).toBe(false);
  });
});
