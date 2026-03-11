import { parseDecimalInput } from "./number-input.js";

function parseAmount(rawValue, lineNumber) {
  const amount = parseDecimalInput(rawValue);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`Linha ${lineNumber}: informe um aporte válido maior ou igual a zero.`);
  }

  return amount;
}

function parseManualKey(rawKey, lineNumber) {
  const monthNumber = Number(rawKey.trim());

  if (!Number.isInteger(monthNumber) || monthNumber < 1) {
    throw new Error(`Linha ${lineNumber}: use números de mês inteiros, como 1, 2 ou 12.`);
  }

  return monthNumber;
}

function parseHistoricalKey(rawKey, lineNumber) {
  const normalizedKey = rawKey.trim();

  if (!/^\d{4}-\d{2}$/.test(normalizedKey)) {
    throw new Error(`Linha ${lineNumber}: use meses no formato AAAA-MM, como 2026-03.`);
  }

  const [, month] = normalizedKey.split("-").map(Number);

  if (month < 1 || month > 12) {
    throw new Error(`Linha ${lineNumber}: use meses válidos entre 01 e 12.`);
  }

  return normalizedKey;
}

export function parseContributionPlan(rawValue, mode) {
  const entries = String(rawValue)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const plan = new Map();

  entries.forEach((line, index) => {
    const lineNumber = index + 1;
    const [rawKey, rawAmount, ...extraParts] = line.split(":");

    if (!rawKey || !rawAmount || extraParts.length > 0) {
      throw new Error(`Linha ${lineNumber}: use o formato chave:valor.`);
    }

    const key =
      mode === "historical"
        ? parseHistoricalKey(rawKey, lineNumber)
        : parseManualKey(rawKey, lineNumber);
    const amount = parseAmount(rawAmount, lineNumber);

    plan.set(key, amount);
  });

  return plan;
}
