/**
 * 集計・フォーマットモジュール
 */

/**
 * 金額を3桁カンマ区切りでフォーマット
 * @param {number} amount
 * @returns {string}
 */
function formatAmount(amount) {
    return amount.toLocaleString("ja-JP");
}

/**
 * 取引データからユニークな月数を計算
 * @param {any[]} transactions - month フィールドを持つ取引データ
 * @returns {number}
 */
function calcMonthSpan(transactions) {
    if (!transactions || transactions.length === 0) return 0;
    const months = new Set(transactions.map((tx) => tx.month).filter(Boolean));
    return months.size;
}

/**
 * カテゴリ別支出を集計
 * @param {any[]} transactions
 * @returns {{ sorted: [string, number][], totalExpense: number }}
 */
function aggregateCategories(transactions) {
    const categoryTotals = {};
    let totalExpense = 0;

    for (const tx of transactions) {
        const cat = tx.category || "その他";
        const amount = tx.amount || 0;
        if (!categoryTotals[cat]) categoryTotals[cat] = 0;
        categoryTotals[cat] += amount;
        totalExpense += amount;
    }

    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    return { sorted, totalExpense };
}

/**
 * 月次集計テキストを生成
 * @param {any[]} transactions
 * @param {string} month
 * @returns {{ text: string, categoryData: { sorted: [string, number][] } | null }}
 */
function buildMonthlySummary(transactions, month) {
    if (!transactions || transactions.length === 0) {
        return { text: `📊 ${month} の集計\n\nデータがありません。`, categoryData: null };
    }

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};

    for (const tx of transactions) {
        if (tx.type === "income") {
            totalIncome += tx.amount;
        } else {
            totalExpense += tx.amount;
            if (!categoryTotals[tx.category]) {
                categoryTotals[tx.category] = 0;
            }
            categoryTotals[tx.category] += tx.amount;
        }
    }

    const balance = totalIncome - totalExpense;

    let text = `📊 ${month} の集計\n`;
    text += `━━━━━━━━━━━━━━━\n`;
    text += `💰 総収入: ¥${formatAmount(totalIncome)}\n`;
    text += `💸 総支出: ¥${formatAmount(totalExpense)}\n`;
    text += `━━━━━━━━━━━━━━━\n`;
    text += `📈 残高: ¥${formatAmount(balance)}\n`;

    const sortedCategories = Object.entries(categoryTotals).sort(
        (a, b) => b[1] - a[1]
    );

    if (sortedCategories.length > 0) {
        text += `\n📂 カテゴリ別支出\n`;
        text += `───────────────\n`;
        for (const [category, total] of sortedCategories) {
            const percentage = ((total / totalExpense) * 100).toFixed(1);
            text += `  ${category}: ¥${formatAmount(total)} (${percentage}%)\n`;
        }
    }

    return {
        text,
        categoryData: sortedCategories.length > 0 ? { sorted: sortedCategories } : null,
    };
}

/**
 * 固定費一覧テキストを生成
 * @param {any[]} fixedExpenses
 * @returns {string}
 */
function buildFixedList(fixedExpenses) {
    if (!fixedExpenses || fixedExpenses.length === 0) {
        return "📋 固定費一覧\n\n登録されている固定費はありません。";
    }

    let text = `📋 固定費一覧\n`;
    text += `━━━━━━━━━━━━━━━\n`;

    let total = 0;
    for (const item of fixedExpenses) {
        const typeIcon = item.type === "income" ? "💰" : "💸";
        text += `${typeIcon} ${item.description}: ¥${formatAmount(item.amount)} [${item.category}]\n`;
        if (item.type === "expense") {
            total += item.amount;
        }
    }

    text += `━━━━━━━━━━━━━━━\n`;
    text += `📌 固定支出合計: ¥${formatAmount(total)}/月`;

    return text;
}

/**
 * 取引登録完了メッセージを生成
 * @param {{ description: string, amount: number, type: string, category: string, is_fixed: boolean }} tx
 * @returns {string}
 */
function buildRegistrationMessage(tx) {
    const typeIcon = tx.type === "income" ? "💰" : "💸";
    const typeLabel = tx.type === "income" ? "収入" : "支出";
    let text = `✅ 登録しました\n`;
    text += `${typeIcon} ${tx.description}: ¥${formatAmount(tx.amount)}\n`;
    text += `📂 ${typeLabel} / ${tx.category}`;
    if (tx.is_fixed) {
        text += ` 📌固定`;
    }
    return text;
}

/**
 * 通算残高テキストを生成
 * @param {any[]} transactions
 * @returns {string}
 */
function buildBalanceSummary(transactions) {
    const monthSpan = calcMonthSpan(transactions);
    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of transactions) {
        if (tx.type === "income") {
            totalIncome += tx.amount;
        } else {
            totalExpense += tx.amount;
        }
    }

    const balance = totalIncome - totalExpense;

    let text = `💰通算残高（${monthSpan}ヶ月）\n`;
    text += `━━━━━━━━━━━━━━━\n`;
    text += `総収入：¥${formatAmount(totalIncome)}\n`;
    text += `総支出：¥${formatAmount(totalExpense)}\n`;
    text += `━━━━━━━━━━━━━━━\n`;
    text += `貯蓄額：¥${formatAmount(balance)}`;

    return text;
}

/**
 * カテゴリ別支出分析テキストを生成
 * @param {any[]} expenses - type=expense の取引一覧 (amount, category, month)
 * @returns {{ text: string, categoryData: { sorted: [string, number][] } | null }}
 */
function buildExpenseAnalysis(expenses) {
    if (!expenses || expenses.length === 0) {
        return { text: "📊支出分析（通算）\n\n支出データがありません。", categoryData: null };
    }

    const monthSpan = calcMonthSpan(expenses);
    const { sorted } = aggregateCategories(expenses);

    let text = `📊支出分析（通算：${monthSpan}ヶ月）\n`;
    text += `━━━━━━━━━━━━━━━\n`;
    for (const [category, total] of sorted) {
        text += `${category}：¥${formatAmount(total)}\n`;
    }

    return {
        text,
        categoryData: sorted.length > 0 ? { sorted } : null,
    };
}

/**
 * カテゴリデータからチャートURL用のクエリパラメータを生成
 * @param {{ sorted: [string, number][] }} categoryData
 * @param {string} title
 * @param {string} baseUrl
 * @returns {string}
 */
function buildChartUrl(categoryData, title, baseUrl) {
    const labels = categoryData.sorted.map(([cat]) => cat).join(",");
    const values = categoryData.sorted.map(([, val]) => val).join(",");
    return `${baseUrl}/api/chart?labels=${encodeURIComponent(labels)}&values=${encodeURIComponent(values)}&title=${encodeURIComponent(title)}`;
}

module.exports = {
    formatAmount,
    calcMonthSpan,
    buildMonthlySummary,
    buildFixedList,
    buildRegistrationMessage,
    buildBalanceSummary,
    buildExpenseAnalysis,
    buildChartUrl,
};
