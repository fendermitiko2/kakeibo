/**
 * メッセージパーサー
 *
 * 対応形式:
 *   {説明} {金額}
 *   {説明} {金額} {カテゴリ}
 *   {説明} {金額} 固定
 *   {説明} {金額} {カテゴリ} 固定
 *
 * コマンド:
 *   今月 → 月次集計
 *   固定一覧 → 固定費一覧
 */

/**
 * コマンドかどうか判定
 * @param {string} text
 * @returns {{ type: 'monthly_summary' | 'fixed_list' } | null}
 */
function parseCommand(text) {
    const trimmed = text.trim();
    if (trimmed === "今月") {
        return { type: "monthly_summary" };
    }
    if (trimmed === "固定一覧") {
        return { type: "fixed_list" };
    }
    if (trimmed === "残高") {
        return { type: "balance" };
    }
    return null;
}

/**
 * 取引メッセージを解析
 * @param {string} text
 * @returns {{ description: string, amount: number, category: string | null, isFixed: boolean } | null}
 */
function parseTransaction(text) {
    const trimmed = text.trim();

    // 全角数字を半角に変換
    const normalized = trimmed.replace(/[０-９]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    );

    // 全角スペースも半角スペースに正規化
    const parts = normalized.replace(/　/g, " ").split(/\s+/);

    if (parts.length < 2) {
        return null;
    }

    const description = parts[0];

    // 金額はカンマ付きも対応
    const amountStr = parts[1].replace(/,/g, "");
    const amount = parseInt(amountStr, 10);

    if (isNaN(amount) || amount <= 0) {
        return null;
    }

    let category = null;
    let isFixed = false;

    // 3つ目以降の引数を処理
    for (let i = 2; i < parts.length; i++) {
        if (parts[i] === "固定") {
            isFixed = true;
        } else if (!category) {
            category = parts[i];
        }
    }

    return {
        description,
        amount,
        category,
        isFixed,
    };
}

/**
 * 現在の月を YYYY-MM 形式で取得（日本時間）
 * @param {Date} [date]
 * @returns {string}
 */
function getCurrentMonth(date) {
    const d = date || new Date();
    // 日本時間 (UTC+9) に変換
    const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const year = jst.getUTCFullYear();
    const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

module.exports = { parseCommand, parseTransaction, getCurrentMonth };
