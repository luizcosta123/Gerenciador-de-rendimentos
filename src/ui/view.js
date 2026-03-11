import { formatCurrency, formatPercent } from "../lib/formatters.js";
import { renderProjectionChart } from "./chart.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildCsvContent(result) {
  const header = ["Mês", "Base", "Taxa (%)", "Juros", "Aporte", "Saldo final"];

  const lines = result.schedule.map((row) => [
    row.label,
    row.sourceLabel,
    row.monthlyRatePercent.toFixed(2),
    row.interestEarned.toFixed(2),
    row.contribution.toFixed(2),
    row.closingBalance.toFixed(2),
  ]);

  return [header, ...lines]
    .map((line) =>
      line.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
}

function resolveBestAndWorstMonths(schedule) {
  return schedule.reduce(
    (accumulator, row) => {
      if (
        accumulator.bestMonth === null ||
        row.interestEarned > accumulator.bestMonth.interestEarned
      ) {
        accumulator.bestMonth = row;
      }

      if (
        accumulator.worstMonth === null ||
        row.interestEarned < accumulator.worstMonth.interestEarned
      ) {
        accumulator.worstMonth = row;
      }

      return accumulator;
    },
    { bestMonth: null, worstMonth: null },
  );
}

export function createView() {
  const form = document.querySelector("#calculator-form");
  const modeInput = document.querySelector("#calculationMode");
  const benchmarkInput = document.querySelector("#historicalBenchmark");
  const manualFields = document.querySelector('[data-fields="manual"]');
  const historicalFields = document.querySelector('[data-fields="historical"]');
  const customContributionFields = document.querySelector(
    '[data-fields="custom-contributions"]',
  );
  const loadingState = document.querySelector("#loadingState");
  const statusMessage = document.querySelector("#statusMessage");
  const projectionTableBody = document.querySelector("#projectionRows");
  const comparisonCards = document.querySelector("#comparisonCards");
  const comparisonSection = document.querySelector("#comparisonSection");
  const exportCsvButton = document.querySelector("#exportCsvButton");
  const customContributionRows = document.querySelector("#customContributionRows");
  const addContributionRowButton = document.querySelector("#addContributionRowButton");
  const customContributionPlanInput = document.querySelector("#customContributionPlan");
  const bestMonthLabel = document.querySelector("#bestMonthLabel");
  const bestMonthValue = document.querySelector("#bestMonthValue");
  const worstMonthLabel = document.querySelector("#worstMonthLabel");
  const worstMonthValue = document.querySelector("#worstMonthValue");
  const totalInterestValue = document.querySelector("#totalInterestValue");
  const totalInvestedValue = document.querySelector("#totalInvested");
  const interestEarnedValue = document.querySelector("#interestEarned");
  const finalAmountValue = document.querySelector("#finalAmount");
  const chartElement = document.querySelector("#projectionChart");
  const chartCurrentValue = document.querySelector("#chartCurrentValue");
  const chartRangeLabel = document.querySelector("#chartRangeLabel");
  const fieldErrorElements = new Map(
    Array.from(document.querySelectorAll("[data-error-for]")).map((element) => [
      element.dataset.errorFor,
      element,
    ]),
  );

  let lastRenderedResult = null;

  function serializeContributionRows() {
    const rows = Array.from(
      customContributionRows.querySelectorAll("[data-contribution-row]"),
    ).map((row) => ({
      key:
        row.querySelector('[data-contribution-field="key"]')?.value.trim() ?? "",
      amount:
        row.querySelector('[data-contribution-field="amount"]')?.value.trim() ?? "",
    }));

    customContributionPlanInput.value = rows
      .filter((row) => row.key || row.amount)
      .map((row) => `${row.key}:${row.amount}`)
      .join("\n");
  }

  function getContributionRows() {
    return Array.from(customContributionRows.querySelectorAll("[data-contribution-row]"));
  }

  function renderContributionRows(rows = [], { mode = "manual" } = {}) {
    const normalizedRows = rows.length > 0 ? rows : [{ key: "", amount: "" }];
    const keyLabel = mode === "historical" ? "Mês" : "Mês";
    const keyPlaceholder = mode === "historical" ? "2026-03" : "1";
    customContributionRows.innerHTML = normalizedRows
      .map(
        (row, index) => `
          <div class="contribution-row" data-contribution-row="${index}">
            <label class="field contribution-key-field">
              <span>${keyLabel}</span>
              <input
                type="${mode === "historical" ? "month" : "number"}"
                min="${mode === "historical" ? "" : "1"}"
                step="${mode === "historical" ? "" : "1"}"
                placeholder="${keyPlaceholder}"
                value="${escapeHtml(row.key ?? "")}"
                data-contribution-field="key"
              />
            </label>
            <label class="field contribution-amount-field">
              <span>Valor</span>
              <div class="step-input step-input-inline">
                <input
                  type="text"
                  inputmode="decimal"
                  data-decimal-input
                  placeholder="0,00"
                  value="${escapeHtml(row.amount ?? "")}"
                  data-contribution-field="amount"
                />
                <div
                  class="step-actions step-actions-inline contribution-step-actions"
                  aria-label="Ajustar valor do aporte"
                >
                  <button
                    type="button"
                    class="step-button"
                    data-step-field="amount"
                    data-step-delta="-1000"
                    aria-label="Diminuir valor do aporte em 1000"
                  >
                    1k
                  </button>
                  <button
                    type="button"
                    class="step-button"
                    data-step-field="amount"
                    data-step-delta="-100"
                    aria-label="Diminuir valor do aporte em 100"
                  >
                    100
                  </button>
                  <button
                    type="button"
                    class="step-button"
                    data-step-field="amount"
                    data-step-delta="100"
                    aria-label="Aumentar valor do aporte em 100"
                  >
                    100
                  </button>
                  <button
                    type="button"
                    class="step-button"
                    data-step-field="amount"
                    data-step-delta="1000"
                    aria-label="Aumentar valor do aporte em 1000"
                  >
                    1k
                  </button>
                </div>
              </div>
            </label>
            <button type="button" class="secondary-action" data-remove-contribution-row>
              Remover
            </button>
          </div>
        `,
      )
      .join("");

    serializeContributionRows();
  }

  function addContributionRow({ key = "", amount = "" } = {}, mode = "manual") {
    const rows = getContributionRows().map((row) => ({
      key: row.querySelector('[data-contribution-field="key"]')?.value ?? "",
      amount: row.querySelector('[data-contribution-field="amount"]')?.value ?? "",
    }));

    rows.push({ key, amount });
    renderContributionRows(rows, { mode });
  }

  function removeContributionRow(rowIndex, mode = "manual") {
    const rows = getContributionRows()
      .map((row) => ({
        key: row.querySelector('[data-contribution-field="key"]')?.value ?? "",
        amount: row.querySelector('[data-contribution-field="amount"]')?.value ?? "",
      }))
      .filter((_, index) => index !== rowIndex);

    renderContributionRows(rows, { mode });
  }

  function syncContributionPlanFromUi() {
    serializeContributionRows();
  }

  function loadContributionPlanFromSerializedValue(mode = "manual") {
    const rows = String(customContributionPlanInput.value ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [key, amount] = line.split(":");
        return { key: key ?? "", amount: amount ?? "" };
      });

    renderContributionRows(rows, { mode });
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

  function clearFieldError(fieldName) {
    const errorElement = fieldErrorElements.get(fieldName);
    const fieldElement = form.elements.namedItem(fieldName);

    if (errorElement) {
      errorElement.textContent = "";
    }

    if (fieldElement instanceof HTMLElement) {
      fieldElement.removeAttribute("aria-invalid");
    }
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

  function renderResult(result) {
    lastRenderedResult = result;

    const { bestMonth, worstMonth } = resolveBestAndWorstMonths(result.schedule);

    totalInvestedValue.textContent = formatCurrency(result.totalInvested);
    interestEarnedValue.textContent = formatCurrency(result.interestEarned);
    finalAmountValue.textContent = formatCurrency(result.finalAmount);
    bestMonthLabel.textContent = bestMonth?.label ?? "-";
    bestMonthValue.textContent = formatCurrency(bestMonth?.interestEarned ?? 0);
    worstMonthLabel.textContent = worstMonth?.label ?? "-";
    worstMonthValue.textContent = formatCurrency(worstMonth?.interestEarned ?? 0);
    totalInterestValue.textContent = formatCurrency(result.interestEarned);
    renderProjectionChart({
      svgElement: chartElement,
      currentValueElement: chartCurrentValue,
      rangeLabelElement: chartRangeLabel,
      result,
    });

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

  function renderComparison(comparison) {
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

  return {
    addContributionRow,
    addContributionRowButton,
    benchmarkInput,
    exportCsvButton,
    form,
    historicalFields,
    manualFields,
    modeInput,
    loadContributionPlanFromSerializedValue,
    removeContributionRow,
    renderContributionRows,
    customContributionFields,
    clearFieldError,
    clearFieldErrors,
    exportCurrentResultToCsv,
    renderComparison,
    renderResult,
    setFieldError,
    setLoading,
    setStatus,
    syncContributionPlanFromUi,
  };
}
