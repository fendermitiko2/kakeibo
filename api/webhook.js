/**
 * LINE Webhook ハンドラ (Vercel Serverless Function)
 */
const crypto = require("crypto");
const { parseCommand, parseTransaction, getCurrentMonth } = require("../lib/parser");
const { isIncome, classifyCategory } = require("../lib/category");
const { insertTransaction, getMonthlyTransactions, getFixedExpenses, getAllTransactions } = require("../lib/db");
const { buildMonthlySummary, buildFixedList, buildRegistrationMessage, buildBalanceSummary } = require("../lib/summary");

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
    try {
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
        } else {
            console.log("LINE reply success");
        }
    } catch (err) {
        console.error("LINE reply exception:", err.message);
    }
}

/**
 * 月次集計コマンドを処理
 */
async function handleMonthlySummary(userId, replyToken) {
    const month = getCurrentMonth();
    console.log("Monthly summary for:", userId, month);

    const { data, error } = await getMonthlyTransactions(userId, month);
    if (error) {
        console.error("DB query error:", JSON.stringify(error));
        await replyMessage(replyToken, "⚠️ データ取得に失敗しました。");
        return;
    }

    console.log("Transactions found:", data.length);
    const summary = buildMonthlySummary(data, month);
    await replyMessage(replyToken, summary);
}

/**
 * 固定費一覧コマンドを処理
 */
async function handleFixedList(userId, replyToken) {
    console.log("Fixed list for:", userId);

    const { data, error } = await getFixedExpenses(userId);
    if (error) {
        console.error("DB query error:", JSON.stringify(error));
        await replyMessage(replyToken, "⚠️ データ取得に失敗しました。");
        return;
    }

    console.log("Fixed expenses found:", data.length);
    const list = buildFixedList(data);
    await replyMessage(replyToken, list);
}

/**
 * 通算残高コマンドを処理
 */
async function handleBalance(userId, replyToken) {
    console.log("Balance for:", userId);

    const { data, error } = await getAllTransactions(userId);
    if (error) {
        console.error("DB query error:", JSON.stringify(error));
        await replyMessage(replyToken, "⚠️ データ取得に失敗しました。");
        return;
    }

    console.log("Total transactions found:", data.length);
    const summary = buildBalanceSummary(data);
    await replyMessage(replyToken, summary);
}

/**
 * 取引登録を処理
 */
async function handleTransaction(parsed, userId, replyToken) {
    const type = isIncome(parsed.description) ? "income" : "expense";
    const category = parsed.category || classifyCategory(parsed.description, type);
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

    console.log("Inserting transaction:", JSON.stringify(txData));

    const { error } = await insertTransaction(txData);
    if (error) {
        console.error("DB insert error:", JSON.stringify(error));
        await replyMessage(replyToken, "⚠️ 登録に失敗しました。もう一度お試しください。");
        return;
    }

    const msg = buildRegistrationMessage(txData);
    await replyMessage(replyToken, msg);
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

    console.log("Received message:", JSON.stringify({ text, userId: userId?.substring(0, 8) + "..." }));

    try {
        // 1. コマンドチェック
        const command = parseCommand(text);
        if (command) {
            console.log("Command detected:", command.type);
            if (command.type === "monthly_summary") {
                await handleMonthlySummary(userId, replyToken);
                return;
            }
            if (command.type === "fixed_list") {
                await handleFixedList(userId, replyToken);
                return;
            }
            if (command.type === "balance") {
                await handleBalance(userId, replyToken);
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

        // 3. 取引登録
        await handleTransaction(parsed, userId, replyToken);
    } catch (err) {
        console.error("handleMessageEvent error:", err.message, err.stack);
        // エラー時もユーザーに通知を試みる
        try {
            await replyMessage(replyToken, "⚠️ エラーが発生しました: " + err.message);
        } catch (replyErr) {
            console.error("Error reply also failed:", replyErr.message);
        }
    }
}

/**
 * Vercel Serverless Function エントリーポイント
 */
module.exports = async function handler(req, res) {
    console.log("Webhook called:", req.method);

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

    console.log("Events count:", events.length);

    // 各イベントを処理（個別にtry/catchされるため、Promise.allでOK）
    await Promise.all(events.map(handleMessageEvent));

    // LINE は 200 を返さないとリトライする
    return res.status(200).json({ status: "ok" });
};
