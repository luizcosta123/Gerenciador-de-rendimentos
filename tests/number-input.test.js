import test from "node:test";
import assert from "node:assert/strict";

import {
  formatDecimalInput,
  parseDecimalInput,
  sanitizeDecimalInputValue,
} from "../src/lib/number-input.js";

test("sanitizeDecimalInputValue keeps digits and a single comma", () => {
  assert.equal(sanitizeDecimalInputValue("1.000,5a1"), "1000,51");
});

test("parseDecimalInput supports comma decimals", () => {
  assert.equal(parseDecimalInput("1000,51"), 1000.51);
});

test("parseDecimalInput supports dot thousands with comma decimals", () => {
  assert.equal(parseDecimalInput("1.000,51"), 1000.51);
});

test("formatDecimalInput preserves cents after increment operations", () => {
  assert.equal(formatDecimalInput(1100.51), "1100,51");
});

test("formatDecimalInput omits decimal places for whole numbers", () => {
  assert.equal(formatDecimalInput(1100), "1100");
});
