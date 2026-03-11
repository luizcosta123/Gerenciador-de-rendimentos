function roundCurrency(value) {
  return Number(value.toFixed(2));
}

export function calculateProjectionFromRates({
  initialAmount,
  monthlyContribution,
  monthlyEntries,
}) {
  let balance = initialAmount;
  let totalInvested = initialAmount;

  const schedule = monthlyEntries.map((entry, index) => {
    const openingBalance = balance;
    const monthlyRate = entry.monthlyRatePercent / 100;
    const interestEarned = openingBalance * monthlyRate;

    balance = openingBalance + interestEarned + monthlyContribution;
    totalInvested += monthlyContribution;

    return {
      index: index + 1,
      label: entry.label,
      sourceLabel: entry.sourceLabel,
      monthlyRatePercent: entry.monthlyRatePercent,
      openingBalance: roundCurrency(openingBalance),
      interestEarned: roundCurrency(interestEarned),
      contribution: roundCurrency(monthlyContribution),
      totalInvested: roundCurrency(totalInvested),
      closingBalance: roundCurrency(balance),
    };
  });

  const finalAmount = roundCurrency(balance);
  const investedAmount = roundCurrency(totalInvested);

  return {
    totalInvested: investedAmount,
    interestEarned: roundCurrency(finalAmount - investedAmount),
    finalAmount,
    schedule,
  };
}

export function calculateManualProjection({
  initialAmount,
  monthlyContribution,
  monthlyRatePercent,
  months,
}) {
  const monthlyEntries = Array.from({ length: months }, (_, index) => ({
    label: `Mes ${index + 1}`,
    sourceLabel: "Taxa informada",
    monthlyRatePercent,
  }));

  return calculateProjectionFromRates({
    initialAmount,
    monthlyContribution,
    monthlyEntries,
  });
}

export function buildSavingsMonthlyRate({ trRatePercent, annualSelicPercent }) {
  if (annualSelicPercent > 8.5) {
    return trRatePercent + 0.5;
  }

  const annualSelicDecimal = annualSelicPercent / 100;
  const monthlyAdditionalRate =
    (Math.pow(1 + annualSelicDecimal * 0.7, 1 / 12) - 1) * 100;

  return trRatePercent + monthlyAdditionalRate;
}

export function calculateHistoricalProjection({
  initialAmount,
  monthlyContribution,
  monthlyEntries,
}) {
  return calculateProjectionFromRates({
    initialAmount,
    monthlyContribution,
    monthlyEntries,
  });
}
