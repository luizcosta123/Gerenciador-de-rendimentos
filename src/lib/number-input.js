export function sanitizeDecimalInputValue(value) {
  const rawValue = String(value);
  const normalized = rawValue.includes(",")
    ? rawValue.replaceAll(".", "")
    : rawValue.replace(".", ",");
  let result = "";
  let hasComma = false;

  for (const character of normalized) {
    if (/\d/.test(character)) {
      result += character;
      continue;
    }

    if (character === "," && !hasComma) {
      result += character;
      hasComma = true;
    }
  }

  return result;
}

export function parseDecimalInput(value) {
  const rawValue = String(value).trim();

  if (!rawValue) {
    return Number.NaN;
  }

  const normalized = rawValue.includes(",")
    ? rawValue.replaceAll(".", "").replace(",", ".")
    : rawValue;
  return Number(normalized);
}

export function formatDecimalInput(value) {
  if (!Number.isFinite(value)) {
    return "";
  }

  const roundedValue = Math.round(value * 100) / 100;

  if (Number.isInteger(roundedValue)) {
    return String(roundedValue);
  }

  return roundedValue.toFixed(2).replace(".", ",");
}
