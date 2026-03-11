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
import { parseContributionPlan } from "./lib/contribution-plan.js";
import {
  formatDecimalInput,
  parseDecimalInput,
  sanitizeDecimalInputValue,
} from "./lib/number-input.js";
import {
  readCommonValues,
  readHistoricalComparisonValues,
  readManualValues,
  validateFormData,
  validateMonthRange,
} from "./lib/validation.js";
import { createView } from "./ui/view.js";

const view = createView();
const {
  addContributionRowButton,
  form,
  modeInput,
  manualFields,
  historicalFields,
  customContributionFields,
} = view;

function syncFieldVisibility() {
  const isHistorical = modeInput.value === "historical";
  const customContributionToggle = form.elements.namedItem("useCustomContributions");
  const hasCustomContributions =
    customContributionToggle instanceof HTMLInputElement && customContributionToggle.checked;

  manualFields.hidden = isHistorical;
  historicalFields.hidden = !isHistorical;
  customContributionFields.hidden = !hasCustomContributions;
  view.loadContributionPlanFromSerializedValue(modeInput.value);

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

  view.renderContributionRows([], { mode: modeInput.value });
}

async function buildScenarioFromFormData(formData) {
  const mode = String(formData.get("calculationMode"));
  const commonValues = readCommonValues(formData);
  const customContributionMap =
    formData.get("useCustomContributions") === "on"
      ? parseContributionPlan(String(formData.get("customContributionPlan") ?? ""), mode)
      : null;

  if (mode === "manual") {
    return calculateManualProjection({
      ...commonValues,
      ...readManualValues(formData),
      customContributionMap,
    });
  }

  const startMonth = String(formData.get("startMonth"));
  const endMonth = String(formData.get("endMonth"));

  validateMonthRange(startMonth, endMonth);

  return buildHistoricalScenario({
    benchmark: String(formData.get("historicalBenchmark")),
    startMonth,
    endMonth,
    customContributionMap,
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
  const customContributionMap =
    formData.get("useCustomContributions") === "on"
      ? parseContributionPlan(String(formData.get("customContributionPlan") ?? ""), mode)
      : null;

  validateMonthRange(startMonth, endMonth);

  return buildComparisonScenarios({
    ...readCommonValues(formData),
    startMonth,
    endMonth,
    ...readHistoricalComparisonValues(formData),
    customContributionMap,
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

  if (field instanceof HTMLInputElement && field.hasAttribute("data-decimal-input")) {
    const sanitizedValue = sanitizeDecimalInputValue(field.value);

    if (field.value !== sanitizedValue) {
      field.value = sanitizedValue;
    }
  }

  if (field instanceof HTMLElement && "name" in field && field.name) {
    view.clearFieldError(field.name);
  }

  if (
    field instanceof HTMLInputElement &&
    field.name === "useCustomContributions"
  ) {
    syncFieldVisibility();
  }

  if (
    field instanceof HTMLInputElement &&
    field.closest("[data-contribution-row]")
  ) {
    view.syncContributionPlanFromUi();
  }

  saveFormState(form);
}

function handleStepAdjustment(event) {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const stepButton = target.closest("[data-step-target]");

  if (!(stepButton instanceof HTMLButtonElement)) {
    return;
  }

  const fieldName = stepButton.dataset.stepTarget;
  const contributionField = stepButton.dataset.stepField;
  const delta = Number(stepButton.dataset.stepDelta);

  if ((!fieldName && !contributionField) || !Number.isFinite(delta)) {
    return;
  }

  let field = null;

  if (fieldName) {
    field = form.elements.namedItem(fieldName);
  } else if (contributionField) {
    field = stepButton
      .closest("[data-contribution-row]")
      ?.querySelector(`[data-contribution-field="${contributionField}"]`);
  }

  if (!(field instanceof HTMLInputElement)) {
    return;
  }

  const currentValue = parseDecimalInput(field.value);
  const nextValue = Math.max(Number.isNaN(currentValue) ? 0 : currentValue + delta, 0);

  field.value = formatDecimalInput(nextValue);
  if (fieldName) {
    view.clearFieldError(fieldName);
  }
  if (contributionField) {
    view.syncContributionPlanFromUi();
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

  view.renderResult(
    calculateManualProjection({
      initialAmount: 1000,
      monthlyContribution: 500,
      monthlyRatePercent: 1,
      months: 12,
    }),
  );
  view.renderComparison(null);
  view.setStatus("Revise os dados preenchidos e clique em Calcular para consultar o histórico.");
}

modeInput.addEventListener("change", () => {
  syncFieldVisibility();
  saveFormState(form);
});
form.addEventListener("submit", handleSubmit);
form.addEventListener("input", handleFieldInteraction);
form.addEventListener("change", handleFieldInteraction);
addContributionRowButton.addEventListener("click", () => {
  view.addContributionRow({}, modeInput.value);
  view.syncContributionPlanFromUi();
  saveFormState(form);
});
form.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  handleStepAdjustment(event);

  const removeButton = target.closest("[data-remove-contribution-row]");

  if (!removeButton) {
    return;
  }

  const row = removeButton.closest("[data-contribution-row]");
  const rowIndex = Number(row?.getAttribute("data-contribution-row"));

  if (Number.isInteger(rowIndex)) {
    view.removeContributionRow(rowIndex, modeInput.value);
    view.syncContributionPlanFromUi();
    saveFormState(form);
  }
});
view.exportCsvButton.addEventListener("click", () => {
  view.exportCurrentResultToCsv();
});

initializeApp();
