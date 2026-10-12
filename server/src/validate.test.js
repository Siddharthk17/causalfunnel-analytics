import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { eventPayload, heatmapQuery, pagination } from "./validate.js";

describe("event payload", () => {
  it("accepts a page_view without coordinates", () => {
    const out = eventPayload.safeParse({
      sessionId: "9f3a2c1e-4b5d-6a7c-8d9e-0f1a2b3c4d5e",
      type: "page_view",
      pageUrl: "https://shop.test/products",
    });
    assert.equal(out.success, true);
  });

  it("rejects a click with no coordinates", () => {
    const out = eventPayload.safeParse({
      sessionId: "9f3a2c1e-4b5d-6a7c-8d9e-0f1a2b3c4d5e",
      type: "click",
      pageUrl: "https://shop.test/products",
    });
    assert.equal(out.success, false);
  });

  it("rejects a bad url", () => {
    const out = eventPayload.safeParse({
      sessionId: "9f3a2c1e-4b5d-6a7c-8d9e-0f1a2b3c4d5e",
      type: "page_view",
      pageUrl: "not-a-url",
    });
    assert.equal(out.success, false);
  });
});

describe("query schemas", () => {
  it("defaults pagination", () => {
    assert.deepEqual(pagination.parse({}), { page: 1, limit: 20 });
  });

  it("requires url for heatmap", () => {
    assert.equal(heatmapQuery.safeParse({}).success, false);
  });
});
