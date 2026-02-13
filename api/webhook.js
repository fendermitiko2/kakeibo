/**
 * LINE Webhook ハンドラ (Vercel Serverless Function)
 */
const crypto = require("crypto");
const { parseCommand, parseTransaction, getCurrentMonth } = require("../lib/parser");
const { isIncome, classifyCategory } = require("../lib/category");
const { insertTransaction, getMonthlyTransactions, getFixedExpenses } = require("../lib/db");
const { buildMonthlySummary, buildFixedList, buildRegistrationMessage } = require("../lib/summary");

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || "";
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

/**
 * LINE署名を検証
 */
function validateSignature(body, signature) {
    const hash = crypto
        .createHmac("SHA256", LINE_CHANNEL_SECRET)
        .update(body)
        .digest("base64");
    return hash === signature;
}

/**
 * LINE返信を送信
 */
async function replyMessage(replyToken, text) {
    const res = await fetch(LINE_REPLY_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
            replyToken,
            messages: [{ type: "text", text }],
        }),
    });

    if (!res.ok) {
        const errorBody = await res.text();
        console.error("LINE reply failed:", res.status, errorBody);
    }
}

/**
 * メッセージイベントを処理
 */
async function handleMessageEvent(event) {
    if (event.type !== "message" || event.message.type !== "text") {
        return;
    }

    const text = event.message.text;
    const userId = event.source.userId;
    const replyToken = event.replyToken;

    // 1. コマンドチェック
    const command = parseCommand(text);
    if (command) {
        if (command.type === "monthly_summary") {
            const month = getCurrentMonth();
            const { data, error } = await getMonthlyTransactions(userId, month);
            if (error) {
                console.error("DB error:", error);
                await replyMessage(replyToken, "⚠️ データ取得に失敗しました。");
                return;
            }
            const summary = buildMonthlySummary(data, month);
            await replyMessage(replyToken, summary);
            return;
        }

        if (command.type === "fixed_list") {
            const { data, error } = await getFixedExpenses(userId);
            if (error) {
                console.error("DB error:", error);
                await replyMessage(replyToken, "⚠️ データ取得に失敗しました。");
                return;
            }
            const list = buildFixedList(data);
            await replyMessage(replyToken, list);
            return;
        }
    }

    // 2. 取引入力チェック
    const parsed = parseTransaction(text);
    if (!parsed) {
        await replyMessage(
            replyToken,
            "📝 使い方:\n\n" +
            "【登録】\n" +
            "ランチ 1200\n" +
            "スーパー 4500 食費\n" +
            "家賃 70000 固定\n\n" +
            "【コマンド】\n" +
            "今月 → 月次集計\n" +
            "固定一覧 → 固定費一覧"
        );
        return;
    }

    // 3. 収入/支出を判定
    const type = isIncome(parsed.description) ? "income" : "expense";

    // 4. カテゴリ分類（ユーザー指定があればそれを優先）
    const category = parsed.category || classifyCategory(parsed.description, type);

    // 5. DB に保存
    const month = getCurrentMonth();
    const txData = {
        user_id: userId,
        month,
        description: parsed.description,
        amount: parsed.amount,
        type,
        category,
        is_fixed: parsed.isFixed,
    };

    const { error } = await insertTransaction(txData);
    if (error) {
        console.error("DB insert error:", error);
        await replyMessage(replyToken, "⚠️ 登録に失敗しました。もう一度お試しください。");
        return;
    }

    // 6. 登録完了を返信
    const msg = buildRegistrationMessage(txData);
    await replyMessage(replyToken, msg);
}

/**
 * Vercel Serverless Function エントリーポイント
 */
module.exports = async function handler(req, res) {
    // GET はヘルスチェック / Webhook URL検証用
    if (req.method === "GET") {
        return res.status(200).json({ status: "ok" });
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // 署名検証
    const signature = req.headers["x-line-signature"];
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    if (!validateSignature(rawBody, signature)) {
        console.error("Invalid signature");
        return res.status(401).json({ error: "Invalid signature" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const events = body.events || [];

    // 各イベントを処理
    try {
        await Promise.all(events.map(handleMessageEvent));
    } catch (err) {
        console.error("Event handling error:", err);
    }

    // LINE は 200 を返さないとリトライする
    return res.status(200).json({ status: "ok" });
};
