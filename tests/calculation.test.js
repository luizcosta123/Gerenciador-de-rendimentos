import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSavingsMonthlyRate,
  calculateManualProjection,
  calculateProjectionFromRates,
} from "../src/calculation.js";

test("manual projection returns totals and a month-by-month schedule", () => {
  const result = calculateManualProjection({
    initialAmount: 1000,
    monthlyContribution: 500,
    monthlyRatePercent: 1,
    months: 3,
  });

  assert.equal(result.totalInvested, 2500);
  assert.equal(result.finalAmount, 2545.35);
  assert.equal(result.interestEarned, 45.35);
  assert.equal(result.schedule.length, 3);
  assert.equal(result.schedule[0].closingBalance, 1510);
  assert.equal(result.schedule[2].closingBalance, 2545.35);
});

test("projection from monthly rates supports varying historical rates", () => {
  const result = calculateProjectionFromRates({
    initialAmount: 1000,
    monthlyContribution: 100,
    monthlyEntries: [
      {
        label: "2025-01",
        sourceLabel: "Serie oficial",
        monthlyRatePercent: 1,
      },
      {
        label: "2025-02",
        sourceLabel: "Serie oficial",
        monthlyRatePercent: 2,
      },
    ],
  });

  assert.equal(result.totalInvested, 1200);
  assert.equal(result.finalAmount, 1232.2);
  assert.equal(result.interestEarned, 32.2);
  assert.equal(result.schedule[1].interestEarned, 22.2);
});

test("savings rate uses fixed 0.5 percent plus TR when Selic is above 8.5 percent", () => {
  const result = buildSavingsMonthlyRate({
    trRatePercent: 0.12,
    annualSelicPercent: 10.5,
  });

  assert.equal(result, 0.62);
});

test("savings rate uses 70 percent of annual Selic monthlyized when Selic is at or below 8.5 percent", () => {
  const result = buildSavingsMonthlyRate({
    trRatePercent: 0.1,
    annualSelicPercent: 8.5,
  });

  assert.ok(Math.abs(result - 0.5828042512537767) < 1e-12);
});

test("manual projection can act as a comparison baseline for the same month count", () => {
  const result = calculateManualProjection({
    initialAmount: 5000,
    monthlyContribution: 200,
    monthlyRatePercent: 0.8,
    months: 2,
  });

  assert.equal(result.schedule.length, 2);
  assert.equal(result.totalInvested, 5400);
  assert.equal(result.finalAmount, 5481.92);
});

test("manual projection supports custom contributions for specific months", () => {
  const result = calculateManualProjection({
    initialAmount: 1000,
    monthlyContribution: 200,
    monthlyRatePercent: 1,
    months: 3,
    customContributionMap: new Map([
      [2, 500],
      [3, 0],
    ]),
  });

  assert.equal(result.totalInvested, 1700);
  assert.equal(result.schedule[0].contribution, 200);
  assert.equal(result.schedule[1].contribution, 500);
  assert.equal(result.schedule[2].contribution, 0);
  assert.equal(result.finalAmount, 1739.32);
});
