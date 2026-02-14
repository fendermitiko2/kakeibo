/**
 * DB操作モジュール
 */
const { supabase } = require("./supabase");

/**
 * 取引を登録
 * @param {{ user_id: string, month: string, description: string, amount: number, type: string, category: string, is_fixed: boolean }} data
 * @returns {Promise<{ data: any, error: any }>}
 */
async function insertTransaction(data) {
    const { data: result, error } = await supabase
        .from("transactions")
        .insert([
            {
                user_id: data.user_id,
                month: data.month,
                description: data.description,
                amount: data.amount,
                type: data.type,
                category: data.category,
                is_fixed: data.is_fixed,
            },
        ])
        .select();

    return { data: result, error };
}

/**
 * 月別の取引を取得
 * @param {string} userId
 * @param {string} month - 'YYYY-MM'
 * @returns {Promise<{ data: any[], error: any }>}
 */
async function getMonthlyTransactions(userId, month) {
    const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .eq("month", month)
        .order("created_at", { ascending: true });

    return { data: data || [], error };
}

/**
 * 固定費一覧を取得（ユーザーの全固定費）
 * @param {string} userId
 * @returns {Promise<{ data: any[], error: any }>}
 */
async function getFixedExpenses(userId) {
    const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .eq("is_fixed", true)
        .order("created_at", { ascending: false });

    // 同じ description の最新のもののみ返す（重複排除）
    const seen = new Set();
    const unique = (data || []).filter((item) => {
        if (seen.has(item.description)) return false;
        seen.add(item.description);
        return true;
    });

    return { data: unique, error };
}

/**
 * 全期間の取引を取得（通算残高用）
 * @param {string} userId
 * @returns {Promise<{ data: any[], error: any }>}
 */
async function getAllTransactions(userId) {
    const { data, error } = await supabase
        .from("transactions")
        .select("amount, type, month")
        .eq("user_id", userId);

    return { data: data || [], error };
}

/**
 * 全期間の支出を取得（分析用）
 * @param {string} userId
 * @returns {Promise<{ data: any[], error: any }>}
 */
async function getAllExpenses(userId) {
    const { data, error } = await supabase
        .from("transactions")
        .select("amount, category, month")
        .eq("user_id", userId)
        .eq("type", "expense");

    return { data: data || [], error };
}

module.exports = { insertTransaction, getMonthlyTransactions, getFixedExpenses, getAllTransactions, getAllExpenses };
