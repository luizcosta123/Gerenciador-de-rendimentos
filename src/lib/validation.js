import { parseContributionPlan } from "./contribution-plan.js";
import { parseDecimalInput } from "./number-input.js";

export function validateMonthRange(startMonth, endMonth) {
  if (!startMonth || !endMonth) {
    throw new Error("Informe o mês inicial e o mês final.");
  }

  if (startMonth > endMonth) {
    throw new Error("O mês inicial não pode ser maior que o mês final.");
  }
}

function readNumber(formData, fieldName) {
  return parseDecimalInput(formData.get(fieldName));
}

export function readCommonValues(formData) {
  return {
    initialAmount: readNumber(formData, "initialAmount"),
    monthlyContribution: readNumber(formData, "monthlyContribution"),
  };
}

export function readManualValues(formData) {
  return {
    monthlyRatePercent: readNumber(formData, "monthlyRate"),
    months: readNumber(formData, "months"),
  };
}

export function readHistoricalComparisonValues(formData) {
  return {
    manualMonthlyRatePercent: readNumber(formData, "comparisonManualRate"),
  };
}

export function validateFormData(formData) {
  const mode = String(formData.get("calculationMode"));
  const errors = [];
  const { initialAmount, monthlyContribution } = readCommonValues(formData);
  const hasCustomContributions = formData.get("useCustomContributions") === "on";
  const contributionPlan = String(formData.get("customContributionPlan") ?? "").trim();

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
    const { monthlyRatePercent: monthlyRate, months } = readManualValues(formData);

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
    const { manualMonthlyRatePercent: comparisonManualRate } =
      readHistoricalComparisonValues(formData);

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

  if (hasCustomContributions) {
    if (!contributionPlan) {
      errors.push([
        "customContributionPlan",
        mode === "historical"
          ? "Informe os aportes personalizados no formato AAAA-MM:valor."
          : "Informe os aportes personalizados no formato mes:valor.",
      ]);
    } else {
      try {
        parseContributionPlan(contributionPlan, mode);
      } catch (error) {
        errors.push(["customContributionPlan", error.message]);
      }
    }
  }

  return errors;
}
