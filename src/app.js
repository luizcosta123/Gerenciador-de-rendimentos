import { calculateManualProjection } from "./calculation.js";
import {
  buildComparisonScenarios,
  buildHistoricalScenario,
} from "./historical-data.js";
import {
  applyStoredFormState,
  loadStoredFormState,
  saveFormState,
} from "./lib/storage.js";
import {
  readCommonValues,
  validateFormData,
  validateMonthRange,
} from "./lib/validation.js";
import { createView } from "./ui/view.js";

const view = createView();
const { form, modeInput, manualFields, historicalFields } = view;

function syncFieldVisibility() {
  const isHistorical = modeInput.value === "historical";

  manualFields.hidden = isHistorical;
  historicalFields.hidden = !isHistorical;

  if (!isHistorical) {
    view.renderComparison(null);
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

function applyDefaultFormValues() {
  const endMonthInput = form.elements.namedItem("endMonth");
  const startMonthInput = form.elements.namedItem("startMonth");
  const comparisonManualRateInput = form.elements.namedItem("comparisonManualRate");

  if (endMonthInput instanceof HTMLInputElement && !endMonthInput.value) {
    endMonthInput.value = currentMonth();
  }

  if (startMonthInput instanceof HTMLInputElement && !startMonthInput.value) {
    startMonthInput.value = previousYearMonth();
  }

  if (
    comparisonManualRateInput instanceof HTMLInputElement &&
    !comparisonManualRateInput.value
  ) {
    comparisonManualRateInput.value = "1";
  }
}

async function buildScenarioFromFormData(formData) {
  const mode = String(formData.get("calculationMode"));
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

async function buildComparisonFromFormData(formData) {
  const mode = String(formData.get("calculationMode"));

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

function getHistoricalStatusLabel(formData) {
  return formData.get("historicalBenchmark") === "savings"
    ? "poupança histórica"
    : "Selic histórica";
}

async function runCalculation({ restored = false } = {}) {
  const formData = new FormData(form);

  view.clearFieldErrors();

  const validationErrors = validateFormData(formData);

  if (validationErrors.length > 0) {
    validationErrors.forEach(([fieldName, message]) => {
      view.setFieldError(fieldName, message);
    });
    view.setStatus("Corrija os campos destacados antes de calcular.", "error");
    return false;
  }

  view.setLoading(true);
  view.setStatus(restored ? "Restaurando último cenário salvo..." : "Calculando...");

  try {
    const [result, comparison] = await Promise.all([
      buildScenarioFromFormData(formData),
      buildComparisonFromFormData(formData),
    ]);

    view.renderResult(result);
    view.renderComparison(comparison);

    if (modeInput.value === "historical") {
      const label = getHistoricalStatusLabel(formData);
      view.setStatus(
        restored
          ? `Último cenário restaurado com base em ${label}.`
          : `Simulação concluída com base em ${label}.`,
        "success",
      );
    } else {
      view.setStatus(
        restored
          ? "Último cenário manual restaurado com sucesso."
          : "Projeção concluída com sucesso.",
        "success",
      );
    }

    return true;
  } catch (error) {
    view.setStatus(error.message, "error");
    return false;
  } finally {
    view.setLoading(false);
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  await runCalculation();
}

function handleFieldInteraction(event) {
  const field = event.target;

  if (field instanceof HTMLElement && "name" in field && field.name) {
    view.clearFieldError(field.name);
  }

  saveFormState(form);
}

async function initializeApp() {
  applyDefaultFormValues();
  applyStoredFormState(form, loadStoredFormState());
  syncFieldVisibility();

  if (modeInput.value === "manual") {
    await runCalculation();
    return;
  }

  const restored = await runCalculation({ restored: true });

  if (!restored) {
    view.renderResult(
      calculateManualProjection({
        initialAmount: 1000,
        monthlyContribution: 500,
        monthlyRatePercent: 1,
        months: 12,
      }),
    );
    view.renderComparison(null);
    view.setStatus("Preencha os campos e execute uma simulação.");
  }
}

modeInput.addEventListener("change", () => {
  syncFieldVisibility();
  saveFormState(form);
});
form.addEventListener("submit", handleSubmit);
form.addEventListener("input", handleFieldInteraction);
form.addEventListener("change", handleFieldInteraction);
view.exportCsvButton.addEventListener("click", () => {
  view.exportCurrentResultToCsv();
});

initializeApp();
