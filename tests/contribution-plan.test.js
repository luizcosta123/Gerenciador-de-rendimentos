import test from "node:test";
import assert from "node:assert/strict";

import { parseContributionPlan } from "../src/lib/contribution-plan.js";

test("parseContributionPlan supports manual month overrides", () => {
  const plan = parseContributionPlan("1:1000\n3:250.50", "manual");

  assert.equal(plan.get(1), 1000);
  assert.equal(plan.get(3), 250.5);
});

test("parseContributionPlan supports historical month overrides", () => {
  const plan = parseContributionPlan("2026-01:900\n2026-03:1200", "historical");

  assert.equal(plan.get("2026-01"), 900);
  assert.equal(plan.get("2026-03"), 1200);
});

test("parseContributionPlan rejects invalid formats", () => {
  assert.throws(
    () => parseContributionPlan("jan:100", "manual"),
    /Linha 1: use números de mês inteiros/,
  );
});

test("parseContributionPlan rejects historical months outside the valid range", () => {
  assert.throws(
    () => parseContributionPlan("2026-13:100", "historical"),
    /Linha 1: use meses válidos entre 01 e 12\./,
  );
});
