import { formatCurrency, formatPercent } from "../lib/formatters.js";

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
  const totalInvestedValue = document.querySelector("#totalInvested");
  const interestEarnedValue = document.querySelector("#interestEarned");
  const finalAmountValue = document.querySelector("#finalAmount");
  const fieldErrorElements = new Map(
    Array.from(document.querySelectorAll("[data-error-for]")).map((element) => [
      element.dataset.errorFor,
      element,
    ]),
  );

  let lastRenderedResult = null;

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
    benchmarkInput,
    exportCsvButton,
    form,
    historicalFields,
    manualFields,
    modeInput,
    clearFieldError,
    clearFieldErrors,
    exportCurrentResultToCsv,
    renderComparison,
    renderResult,
    setFieldError,
    setLoading,
    setStatus,
  };
}
