import test from "node:test";
import assert from "node:assert/strict";

import {
  readHistoricalComparisonValues,
  readManualValues,
  validateFormData,
  validateMonthRange,
} from "../src/lib/validation.js";

function buildFormData(entries) {
  const formData = new FormData();

  Object.entries(entries).forEach(([key, value]) => {
    formData.set(key, String(value));
  });

  return formData;
}

test("validateFormData accepts a valid manual scenario", () => {
  const errors = validateFormData(
    buildFormData({
      calculationMode: "manual",
      initialAmount: 1000,
      monthlyContribution: 500,
      monthlyRate: 1,
      months: 12,
    }),
  );

  assert.deepEqual(errors, []);
});

test("validateFormData rejects invalid historical month range and comparison rate", () => {
  const errors = validateFormData(
    buildFormData({
      calculationMode: "historical",
      initialAmount: 1000,
      monthlyContribution: 200,
      startMonth: "2026-03",
      endMonth: "2026-01",
      comparisonManualRate: -1,
    }),
  );

  assert.deepEqual(errors, [
    ["endMonth", "O mês final deve ser igual ou posterior ao inicial."],
    ["comparisonManualRate", "Informe uma taxa manual de comparação maior ou igual a zero."],
  ]);
});

test("validateMonthRange throws when the initial month is after the final month", () => {
  assert.throws(
    () => validateMonthRange("2026-04", "2026-03"),
    /O mês inicial não pode ser maior que o mês final\./,
  );
});

test("readManualValues supports decimal rates with comma separators", () => {
  const values = readManualValues(
    buildFormData({
      monthlyRate: "1,5",
      months: 12,
    }),
  );

  assert.deepEqual(values, {
    monthlyRatePercent: 1.5,
    months: 12,
  });
});

test("readHistoricalComparisonValues supports decimal rates with comma separators", () => {
  const values = readHistoricalComparisonValues(
    buildFormData({
      comparisonManualRate: "0,85",
    }),
  );

  assert.deepEqual(values, {
    manualMonthlyRatePercent: 0.85,
  });
});
