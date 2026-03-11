import { calculateManualProjection } from "./calculation.js";
import {
  buildComparisonScenarios,
  buildHistoricalScenario,
} from "./historical-data.js";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const form = document.querySelector("#calculator-form");
const modeInput = document.querySelector("#calculationMode");
const benchmarkInput = document.querySelector("#historicalBenchmark");
const manualFields = document.querySelector('[data-fields="manual"]');
const historicalFields = document.querySelector('[data-fields="historical"]');
const loadingState = document.querySelector("#loadingState");
const statusMessage = document.querySelector("#statusMessage");
const projectionTableBody = document.querySelector("#projectionRows");
const comparisonCards = document.querySelector("#comparisonCards");
const comparisonSection = document.querySelector("#comparisonSection");
const exportCsvButton = document.querySelector("#exportCsvButton");
const bestMonthLabel = document.querySelector("#bestMonthLabel");
const bestMonthValue = document.querySelector("#bestMonthValue");
const worstMonthLabel = document.querySelector("#worstMonthLabel");
const worstMonthValue = document.querySelector("#worstMonthValue");
const totalInterestValue = document.querySelector("#totalInterestValue");
const fieldErrorElements = new Map(
  Array.from(document.querySelectorAll("[data-error-for]")).map((element) => [
    element.dataset.errorFor,
    element,
  ]),
);
let lastRenderedResult = null;

function formatCurrency(value) {
  return currencyFormatter.format(value);
}

function formatPercent(value) {
  return `${percentFormatter.format(value)}%`;
}

function setStatus(message, tone = "neutral") {
  statusMessage.textContent = message;
  statusMessage.dataset.tone = tone;
}

function setLoading(isLoading) {
  loadingState.hidden = !isLoading;
}

function clearFieldErrors() {
  fieldErrorElements.forEach((element) => {
    element.textContent = "";
  });

  Array.from(form.elements).forEach((element) => {
    if (element instanceof HTMLElement) {
      element.removeAttribute("aria-invalid");
    }
  });
}

function setFieldError(fieldName, message) {
  const errorElement = fieldErrorElements.get(fieldName);
  const fieldElement = form.elements.namedItem(fieldName);

  if (errorElement) {
    errorElement.textContent = message;
  }

  if (fieldElement instanceof HTMLElement) {
    fieldElement.setAttribute("aria-invalid", "true");
  }
}

function updateResults(result) {
  lastRenderedResult = result;
  const bestMonth = result.schedule.reduce(
    (best, row) => (!best || row.interestEarned > best.interestEarned ? row : best),
    null,
  );
  const worstMonth = result.schedule.reduce(
    (worst, row) =>
      !worst || row.interestEarned < worst.interestEarned ? row : worst,
    null,
  );

  document.querySelector("#totalInvested").textContent = formatCurrency(
    result.totalInvested,
  );
  document.querySelector("#interestEarned").textContent = formatCurrency(
    result.interestEarned,
  );
  document.querySelector("#finalAmount").textContent = formatCurrency(
    result.finalAmount,
  );
  bestMonthLabel.textContent = bestMonth?.label ?? "-";
  bestMonthValue.textContent = formatCurrency(bestMonth?.interestEarned ?? 0);
  worstMonthLabel.textContent = worstMonth?.label ?? "-";
  worstMonthValue.textContent = formatCurrency(worstMonth?.interestEarned ?? 0);
  totalInterestValue.textContent = formatCurrency(result.interestEarned);

  projectionTableBody.innerHTML = result.schedule
    .map(
      (row) => `
        <tr class="${
          row.label === bestMonth?.label
            ? "is-best-month"
            : row.label === worstMonth?.label
              ? "is-worst-month"
              : ""
        }">
          <td>${row.label}</td>
          <td>${row.sourceLabel}</td>
          <td>${formatPercent(row.monthlyRatePercent)}</td>
          <td>${formatCurrency(row.interestEarned)}</td>
          <td>${formatCurrency(row.contribution)}</td>
          <td>${formatCurrency(row.closingBalance)}</td>
        </tr>
      `,
    )
    .join("");
}

function updateComparisonCards(comparison) {
  if (!comparison) {
    comparisonSection.hidden = true;
    comparisonCards.innerHTML = "";
    return;
  }

  const rankedCards = Object.values(comparison).sort(
    (left, right) => right.result.finalAmount - left.result.finalAmount,
  );
  const leadingAmount = rankedCards[0].result.finalAmount;

  comparisonCards.innerHTML = rankedCards
    .map(
      (entry, index) => `
        <article class="comparison-card ${index === 0 ? "is-leading" : "is-trailing"}">
          <p class="comparison-rank">#${index + 1}</p>
          <h3>${entry.label}</h3>
          <dl>
            <div>
              <dt>Montante final</dt>
              <dd>${formatCurrency(entry.result.finalAmount)}</dd>
            </div>
            <div>
              <dt>Juros ganhos</dt>
              <dd>${formatCurrency(entry.result.interestEarned)}</dd>
            </div>
            <div>
              <dt>Diferença para o líder</dt>
              <dd>${
                index === 0
                  ? "Líder"
                  : formatCurrency(leadingAmount - entry.result.finalAmount)
              }</dd>
            </div>
          </dl>
        </article>
      `,
    )
    .join("");

  comparisonSection.hidden = false;
}

function syncFieldVisibility() {
  const isHistorical = modeInput.value === "historical";

  manualFields.hidden = isHistorical;
  historicalFields.hidden = !isHistorical;

  if (!isHistorical) {
    updateComparisonCards(null);
  }
}

function buildCsvContent(result) {
  const header = [
    "Mes",
    "Base",
    "Taxa (%)",
    "Juros",
    "Aporte",
    "Saldo final",
  ];

  const lines = result.schedule.map((row) => [
    row.label,
    row.sourceLabel,
    row.monthlyRatePercent.toFixed(2),
    row.interestEarned.toFixed(2),
    row.contribution.toFixed(2),
    row.closingBalance.toFixed(2),
  ]);

  return [header, ...lines]
    .map((line) => line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

function exportCurrentResultToCsv() {
  if (!lastRenderedResult) {
    setStatus("Nenhum resultado disponível para exportar.", "error");
    return;
  }

  const blob = new Blob([buildCsvContent(lastRenderedResult)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "projecao-rendimentos.csv";
  anchor.click();

  URL.revokeObjectURL(url);
  setStatus("CSV exportado com sucesso.", "success");
}

function validateMonthRange(startMonth, endMonth) {
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

function validateForm(formElement) {
  const formData = new FormData(formElement);
  const mode = String(formData.get("calculationMode"));
  const errors = [];
  const initialAmount = readNumber(formData, "initialAmount");
  const monthlyContribution = readNumber(formData, "monthlyContribution");

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

function readCommonValues(formData) {
  return {
    initialAmount: Number(formData.get("initialAmount")),
    monthlyContribution: Number(formData.get("monthlyContribution")),
  };
}

async function buildScenarioFromForm(formElement) {
  const formData = new FormData(formElement);
  const mode = formData.get("calculationMode");
  const commonValues = readCommonValues(formData);

  if (mode === "manual") {
    return calculateManualProjection({
      ...commonValues,
      monthlyRatePercent: Number(formData.get("monthlyRate")),
      months: Number(formData.get("months")),
    });
  }

  const startMonth = String(formData.get("startMonth"));
  const endMonth = String(formData.get("endMonth"));

  validateMonthRange(startMonth, endMonth);

  return buildHistoricalScenario({
    benchmark: String(formData.get("historicalBenchmark")),
    startMonth,
    endMonth,
    ...commonValues,
  });
}

async function buildComparisonFromForm(formElement) {
  const formData = new FormData(formElement);
  const mode = formData.get("calculationMode");

  if (mode !== "historical") {
    return null;
  }

  const startMonth = String(formData.get("startMonth"));
  const endMonth = String(formData.get("endMonth"));

  validateMonthRange(startMonth, endMonth);

  return buildComparisonScenarios({
    ...readCommonValues(formData),
    startMonth,
    endMonth,
    manualMonthlyRatePercent: Number(formData.get("comparisonManualRate")),
  });
}

async function handleSubmit(event) {
  event.preventDefault();
  clearFieldErrors();
  const validationErrors = validateForm(form);

  if (validationErrors.length > 0) {
    validationErrors.forEach(([fieldName, message]) => {
      setFieldError(fieldName, message);
    });
    setStatus("Corrija os campos destacados antes de calcular.", "error");
    return;
  }

  setLoading(true);
  setStatus("Calculando...");

  try {
    const [result, comparison] = await Promise.all([
      buildScenarioFromForm(form),
      buildComparisonFromForm(form),
    ]);
    updateResults(result);
    updateComparisonCards(comparison);

    if (modeInput.value === "historical") {
      const label =
        benchmarkInput.value === "savings" ? "poupança histórica" : "Selic histórica";
      setStatus(`Simulação concluída com base em ${label}.`, "success");
    } else {
      setStatus("Projeção concluída com sucesso.", "success");
    }
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    setLoading(false);
  }
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function previousYearMonth() {
  const now = new Date();
  return `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

modeInput.addEventListener("change", syncFieldVisibility);
form.addEventListener("submit", handleSubmit);
exportCsvButton.addEventListener("click", exportCurrentResultToCsv);

Array.from(form.elements).forEach((element) => {
  if (element instanceof HTMLElement && "name" in element && element.name) {
    element.addEventListener("input", () => {
      const errorElement = fieldErrorElements.get(element.name);

      if (errorElement?.textContent) {
        errorElement.textContent = "";
        element.removeAttribute("aria-invalid");
      }
    });
  }
});

document.querySelector("#endMonth").value = currentMonth();
document.querySelector("#startMonth").value = previousYearMonth();

syncFieldVisibility();
updateResults(
  calculateManualProjection({
    initialAmount: 1000,
    monthlyContribution: 500,
    monthlyRatePercent: 1,
    months: 12,
  }),
);
updateComparisonCards(null);
setStatus("Preencha os campos e execute uma simulação.");
