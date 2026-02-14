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
 * 月次集計テキストを生成
 * @param {any[]} transactions
 * @param {string} month
 * @returns {string}
 */
function buildMonthlySummary(transactions, month) {
    if (!transactions || transactions.length === 0) {
        return `📊 ${month} の集計\n\nデータがありません。`;
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

    // カテゴリ別支出
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

    return text;
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

    let text = `💰通算残高\n`;
    text += `━━━━━━━━━━━━━━━\n`;
    text += `総収入：¥${formatAmount(totalIncome)}\n`;
    text += `総支出：¥${formatAmount(totalExpense)}\n`;
    text += `━━━━━━━━━━━━━━━\n`;
    text += `貯蓄額：¥${formatAmount(balance)}`;

    return text;
}

/**
 * カテゴリ別支出分析テキストを生成
 * @param {any[]} expenses - type=expense の取引一覧
 * @returns {string}
 */
function buildExpenseAnalysis(expenses) {
    if (!expenses || expenses.length === 0) {
        return "📊支出分析（通算）\n\n支出データがありません。";
    }

    const categoryTotals = {};
    for (const tx of expenses) {
        if (!categoryTotals[tx.category]) {
            categoryTotals[tx.category] = 0;
        }
        categoryTotals[tx.category] += tx.amount;
    }

    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

    let text = `📊支出分析（通算）\n`;
    text += `━━━━━━━━━━━━━━━\n`;
    for (const [category, total] of sorted) {
        text += `${category}：¥${formatAmount(total)}\n`;
    }

    return text;
}

module.exports = {
    formatAmount,
    buildMonthlySummary,
    buildFixedList,
    buildRegistrationMessage,
    buildBalanceSummary,
    buildExpenseAnalysis,
};
