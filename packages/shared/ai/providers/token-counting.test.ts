import { countTokens, batchTextsByTokenLimit, MAX_TOKENS_PER_EMBEDDING_REQUEST } from "./token-counting";

describe("countTokens", () => {
  it("returns the real cl100k_base token count, not a chars/4 approximation", () => {
    expect(countTokens("hello")).toBe(1);
    expect(countTokens("world foo")).toBe(2);
  });
});

describe("batchTextsByTokenLimit", () => {
  it("keeps everything in one batch when it fits under the default cap", () => {
    const batches = batchTextsByTokenLimit(["hello", "world foo"]);
    expect(batches).toEqual([["hello", "world foo"]]);
  });

  it("splits into multiple batches once the running total would exceed the limit", () => {
    // "hello" is 1 token each; a cap of 2 fits exactly two per batch.
    const batches = batchTextsByTokenLimit(["hello", "hello", "hello"], 2);
    expect(batches).toEqual([["hello", "hello"], ["hello"]]);
  });

  it("gives a single text that alone exceeds the cap its own batch rather than dropping or erroring", () => {
    // "world foo" is 2 tokens, over a cap of 1.
    const batches = batchTextsByTokenLimit(["world foo"], 1);
    expect(batches).toEqual([["world foo"]]);
  });

  it("returns no batches for an empty input", () => {
    expect(batchTextsByTokenLimit([])).toEqual([]);
  });

  it("defaults to a cap comfortably under OpenRouter's real 300,000-token/request limit", () => {
    expect(MAX_TOKENS_PER_EMBEDDING_REQUEST).toBeLessThan(300_000);
    expect(MAX_TOKENS_PER_EMBEDDING_REQUEST).toBe(250_000);
  });
});
