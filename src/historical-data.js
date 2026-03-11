import {
  buildSavingsMonthlyRate,
  calculateHistoricalProjection,
  calculateManualProjection,
} from "./calculation.js";

const SERIES_CODES = {
  trDailyRate: 226,
  selicMonthlyThresholdAnnualized: 4189,
  selicMonthlyRate: 4390,
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function buildMonthKey(year, monthIndex) {
  return `${year}-${pad(monthIndex + 1)}`;
}

function parseBrazilianDate(value) {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function buildBcbUrl(seriesCode, startMonth, endMonth) {
  const [startYear, startMonthValue] = startMonth.split("-").map(Number);
  const [endYear, endMonthValue] = endMonth.split("-").map(Number);
  const startDate = `01/${pad(startMonthValue)}/${startYear}`;
  const endDate = `${pad(
    new Date(Date.UTC(endYear, endMonthValue, 0)).getUTCDate(),
  )}/${pad(endMonthValue)}/${endYear}`;

  return (
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs/${seriesCode}/dados` +
    `?formato=json&dataInicial=${startDate}&dataFinal=${endDate}`
  );
}

async function fetchSeries(seriesCode, startMonth, endMonth) {
  const response = await fetch(buildBcbUrl(seriesCode, startMonth, endMonth));

  if (!response.ok) {
    throw new Error(`Falha ao consultar a série ${seriesCode} do Banco Central.`);
  }

  return response.json();
}

async function fetchSeriesMap(seriesCode, startMonth, endMonth) {
  return normalizeMonthlySeries(await fetchSeries(seriesCode, startMonth, endMonth));
}

function listMonthKeys(startMonth, endMonth) {
  const [startYear, startMonthValue] = startMonth.split("-").map(Number);
  const [endYear, endMonthValue] = endMonth.split("-").map(Number);

  const start = new Date(Date.UTC(startYear, startMonthValue - 1, 1));
  const end = new Date(Date.UTC(endYear, endMonthValue - 1, 1));
  const months = [];

  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
  ) {
    months.push(buildMonthKey(cursor.getUTCFullYear(), cursor.getUTCMonth()));
  }

  return months;
}

function normalizeMonthlySeries(items) {
  const monthlyMap = new Map();

  items.forEach((item) => {
    const date = parseBrazilianDate(item.data);
    const monthKey = buildMonthKey(date.getUTCFullYear(), date.getUTCMonth());

    monthlyMap.set(monthKey, {
      date,
      value: Number(String(item.valor).replace(",", ".")),
    });
  });

  return new Map(
    Array.from(monthlyMap.entries()).map(([monthKey, item]) => [monthKey, item.value]),
  );
}

function monthDistance(startMonth, endMonth) {
  const [startYear, startMonthValue] = startMonth.split("-").map(Number);
  const [endYear, endMonthValue] = endMonth.split("-").map(Number);

  return (endYear - startYear) * 12 + (endMonthValue - startMonthValue);
}

export async function buildHistoricalScenario({
  benchmark,
  startMonth,
  endMonth,
  initialAmount,
  monthlyContribution,
  customContributionMap = null,
}) {
  const monthKeys = listMonthKeys(startMonth, endMonth);

  if (monthKeys.length === 0) {
    throw new Error("Selecione um intervalo mensal válido.");
  }

  if (benchmark === "selic") {
    const selicSeries = await fetchSeriesMap(
      SERIES_CODES.selicMonthlyRate,
      startMonth,
      endMonth,
    );

    const monthlyEntries = monthKeys.map((monthKey) => {
      const monthlyRatePercent = selicSeries.get(monthKey);

      if (monthlyRatePercent === undefined) {
        throw new Error(`Não foi possível obter a Selic para ${monthKey}.`);
      }

      return {
        label: monthKey,
        sourceLabel: "Selic mensal oficial",
        monthlyRatePercent,
      };
    });

    return calculateHistoricalProjection({
      initialAmount,
      monthlyContribution,
      monthlyEntries,
      customContributionMap,
    });
  }

  if (benchmark === "savings") {
    if (monthDistance(startMonth, endMonth) > 119) {
      throw new Error(
        "A simulação histórica da poupança aceita no máximo 10 anos por consulta.",
      );
    }

    const [trSeriesItems, selicSeriesItems] = await Promise.all([
      fetchSeriesMap(SERIES_CODES.trDailyRate, startMonth, endMonth),
      fetchSeriesMap(
        SERIES_CODES.selicMonthlyThresholdAnnualized,
        startMonth,
        endMonth,
      ),
    ]);
    const [trSeries, selicSeries] = [trSeriesItems, selicSeriesItems];

    const monthlyEntries = monthKeys.map((monthKey) => {
      const trRatePercent = trSeries.get(monthKey);
      const annualSelicPercent = selicSeries.get(monthKey);

      if (trRatePercent === undefined || annualSelicPercent === undefined) {
        throw new Error(
          `Não foi possível obter todos os dados oficiais para ${monthKey}.`,
        );
      }

      return {
        label: monthKey,
        sourceLabel: "Poupança estimada com TR + regra da Selic",
        monthlyRatePercent: buildSavingsMonthlyRate({
          trRatePercent,
          annualSelicPercent,
        }),
      };
    });

    return calculateHistoricalProjection({
      initialAmount,
      monthlyContribution,
      monthlyEntries,
      customContributionMap,
    });
  }

  throw new Error("Benchmark histórico não suportado.");
}

export async function buildComparisonScenarios({
  startMonth,
  endMonth,
  initialAmount,
  monthlyContribution,
  manualMonthlyRatePercent,
  customContributionMap = null,
}) {
  const monthKeys = listMonthKeys(startMonth, endMonth);

  if (monthKeys.length === 0) {
    throw new Error("Selecione um intervalo mensal válido.");
  }

  if (monthDistance(startMonth, endMonth) > 119) {
    throw new Error(
      "A comparação histórica aceita no máximo 10 anos por consulta.",
    );
  }

  const [selicSeries, trSeries, selicThresholdSeries] = await Promise.all([
    fetchSeriesMap(SERIES_CODES.selicMonthlyRate, startMonth, endMonth),
    fetchSeriesMap(SERIES_CODES.trDailyRate, startMonth, endMonth),
    fetchSeriesMap(SERIES_CODES.selicMonthlyThresholdAnnualized, startMonth, endMonth),
  ]);

  const selicEntries = monthKeys.map((monthKey) => {
    const monthlyRatePercent = selicSeries.get(monthKey);

    if (monthlyRatePercent === undefined) {
      throw new Error(`Não foi possível obter a Selic para ${monthKey}.`);
    }

    return {
      label: monthKey,
      sourceLabel: "Selic mensal oficial",
      monthlyRatePercent,
    };
  });

  const savingsEntries = monthKeys.map((monthKey) => {
    const trRatePercent = trSeries.get(monthKey);
    const annualSelicPercent = selicThresholdSeries.get(monthKey);

    if (trRatePercent === undefined || annualSelicPercent === undefined) {
      throw new Error(`Não foi possível obter todos os dados oficiais para ${monthKey}.`);
    }

    return {
      label: monthKey,
      sourceLabel: "Poupança estimada com TR + regra da Selic",
      monthlyRatePercent: buildSavingsMonthlyRate({
        trRatePercent,
        annualSelicPercent,
      }),
    };
  });

  const months = monthKeys.length;

  return {
    manual: {
      label: "Taxa manual",
      result: calculateManualProjection({
        initialAmount,
        monthlyContribution,
        monthlyRatePercent: manualMonthlyRatePercent,
        months,
        customContributionMap,
      }),
    },
    selic: {
      label: "Selic histórica",
      result: calculateHistoricalProjection({
        initialAmount,
        monthlyContribution,
        monthlyEntries: selicEntries,
        customContributionMap,
      }),
    },
    savings: {
      label: "Poupança histórica",
      result: calculateHistoricalProjection({
        initialAmount,
        monthlyContribution,
        monthlyEntries: savingsEntries,
        customContributionMap,
      }),
    },
  };
}
