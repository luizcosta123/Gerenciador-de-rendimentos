export function validateMonthRange(startMonth, endMonth) {
  if (!startMonth || !endMonth) {
    throw new Error("Informe o mês inicial e o mês final.");
  }

  if (startMonth > endMonth) {
    throw new Error("O mês inicial não pode ser maior que o mês final.");
  }
}

function readNumber(formData, fieldName) {
  return Number(formData.get(fieldName));
}

export function readCommonValues(formData) {
  return {
    initialAmount: readNumber(formData, "initialAmount"),
    monthlyContribution: readNumber(formData, "monthlyContribution"),
  };
}

export function validateFormData(formData) {
  const mode = String(formData.get("calculationMode"));
  const errors = [];
  const { initialAmount, monthlyContribution } = readCommonValues(formData);

  if (!Number.isFinite(initialAmount) || initialAmount < 0) {
    errors.push(["initialAmount", "Informe um valor inicial maior ou igual a zero."]);
  }

  if (!Number.isFinite(monthlyContribution) || monthlyContribution < 0) {
    errors.push([
      "monthlyContribution",
      "Informe um aporte mensal maior ou igual a zero.",
    ]);
  }

  if (mode === "manual") {
    const monthlyRate = readNumber(formData, "monthlyRate");
    const months = readNumber(formData, "months");

    if (!Number.isFinite(monthlyRate) || monthlyRate < 0) {
      errors.push(["monthlyRate", "Informe uma taxa mensal maior ou igual a zero."]);
    }

    if (!Number.isInteger(months) || months < 1) {
      errors.push(["months", "Informe um período inteiro de pelo menos 1 mês."]);
    }
  }

  if (mode === "historical") {
    const startMonth = String(formData.get("startMonth"));
    const endMonth = String(formData.get("endMonth"));
    const comparisonManualRate = readNumber(formData, "comparisonManualRate");

    if (!startMonth) {
      errors.push(["startMonth", "Informe o mês inicial."]);
    }

    if (!endMonth) {
      errors.push(["endMonth", "Informe o mês final."]);
    }

    if (startMonth && endMonth && startMonth > endMonth) {
      errors.push(["endMonth", "O mês final deve ser igual ou posterior ao inicial."]);
    }

    if (!Number.isFinite(comparisonManualRate) || comparisonManualRate < 0) {
      errors.push([
        "comparisonManualRate",
        "Informe uma taxa manual de comparação maior ou igual a zero.",
      ]);
    }
  }

  return errors;
}
