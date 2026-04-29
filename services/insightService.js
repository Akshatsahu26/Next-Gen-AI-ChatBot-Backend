const groupByMonth = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const calculateInsights = (transactions = []) => {
  const debitTransactions = transactions.filter((tx) => tx.type === 'debit');

  const monthlyTotals = {};
  const categoryBreakdown = {};

  debitTransactions.forEach((tx) => {
    const amount = Number(tx.amount) || 0;
    const monthKey = groupByMonth(new Date(tx.date));
    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + amount;

    categoryBreakdown[tx.category] = (categoryBreakdown[tx.category] || 0) + amount;
  });

  const sortedCategories = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCategories[0]
    ? { category: sortedCategories[0][0], amount: sortedCategories[0][1] }
    : null;

  const monthKeys = Object.keys(monthlyTotals).sort();
  const currentMonth = monthKeys[monthKeys.length - 1] || null;
  const previousMonth = monthKeys[monthKeys.length - 2] || null;

  const currentMonthSpending = currentMonth ? monthlyTotals[currentMonth] : 0;
  const previousMonthSpending = previousMonth ? monthlyTotals[previousMonth] : 0;

  const change = currentMonthSpending - previousMonthSpending;
  const percentageChange = previousMonthSpending
    ? Number(((change / previousMonthSpending) * 100).toFixed(2))
    : null;

  return {
    monthlyTotalSpending: currentMonthSpending,
    categoryBreakdown,
    topCategory,
    monthComparison: {
      currentMonth,
      previousMonth,
      currentMonthSpending,
      previousMonthSpending,
      change,
      percentageChange,
    },
  };
};

module.exports = {
  calculateInsights,
};