/**
 * パーサーとカテゴリ分類のユニットテスト
 */
const { parseCommand, parseTransaction, getCurrentMonth } = require("../lib/parser");
const { isIncome, classifyCategory } = require("../lib/category");
const { buildMonthlySummary, buildFixedList, buildRegistrationMessage } = require("../lib/summary");

let passed = 0;
let failed = 0;

function assert(condition, testName) {
    if (condition) {
        console.log(`  ✅ ${testName}`);
        passed++;
    } else {
        console.error(`  ❌ ${testName}`);
        failed++;
    }
}

function assertEq(actual, expected, testName) {
    if (actual === expected) {
        console.log(`  ✅ ${testName}`);
        passed++;
    } else {
        console.error(`  ❌ ${testName}: expected "${expected}", got "${actual}"`);
        failed++;
    }
}

// ========== パーサー テスト ==========
console.log("\n📝 パーサー テスト");

// コマンド
assertEq(parseCommand("今月")?.type, "monthly_summary", "今月 コマンド");
assertEq(parseCommand("固定一覧")?.type, "fixed_list", "固定一覧 コマンド");
assertEq(parseCommand("ランチ 1200"), null, "取引はコマンドでない");

// 基本的な取引
const t1 = parseTransaction("ランチ 1200");
assertEq(t1?.description, "ランチ", "説明: ランチ");
assertEq(t1?.amount, 1200, "金額: 1200");
assertEq(t1?.isFixed, false, "固定でない");

// カテゴリ付き取引
const t2 = parseTransaction("スーパー 4500 食費");
assertEq(t2?.description, "スーパー", "説明: スーパー");
assertEq(t2?.amount, 4500, "金額: 4500");
assertEq(t2?.category, "食費", "カテゴリ: 食費");

// 固定費
const t3 = parseTransaction("家賃 70000 固定");
assertEq(t3?.description, "家賃", "説明: 家賃");
assertEq(t3?.amount, 70000, "金額: 70000");
assertEq(t3?.isFixed, true, "固定");

// カテゴリ+固定
const t4 = parseTransaction("電気 8000 光熱費 固定");
assertEq(t4?.description, "電気", "説明: 電気");
assertEq(t4?.category, "光熱費", "カテゴリ: 光熱費");
assertEq(t4?.isFixed, true, "固定");

// 全角数字
const t5 = parseTransaction("ランチ １２００");
assertEq(t5?.amount, 1200, "全角数字 → 1200");

// カンマ付き金額
const t6 = parseTransaction("給料 250,000");
assertEq(t6?.amount, 250000, "カンマ付き金額 → 250000");

// 無効な入力
assertEq(parseTransaction("こんにちは"), null, "金額なしは null");
assertEq(parseTransaction("ランチ abc"), null, "不正な金額は null");

// 月取得
const month = getCurrentMonth(new Date("2026-02-13T18:00:00+09:00"));
assertEq(month, "2026-02", "月: 2026-02");

// ========== カテゴリ分類 テスト ==========
console.log("\n📂 カテゴリ分類 テスト");

assert(isIncome("給料"), "給料は収入");
assert(isIncome("ボーナス"), "ボーナスは収入");
assert(!isIncome("ランチ"), "ランチは収入でない");
assert(!isIncome("家賃"), "家賃は収入でない");

assertEq(classifyCategory("ランチ", "expense"), "食費", "ランチ → 食費");
assertEq(classifyCategory("電車", "expense"), "交通費", "電車 → 交通費");
assertEq(classifyCategory("家賃", "expense"), "住居費", "家賃 → 住居費");
assertEq(classifyCategory("電気", "expense"), "光熱費", "電気 → 光熱費");
assertEq(classifyCategory("スマホ", "expense"), "通信費", "スマホ → 通信費");
assertEq(classifyCategory("映画", "expense"), "娯楽", "映画 → 娯楽");
assertEq(classifyCategory("何か", "expense"), "その他", "不明 → その他");
assertEq(classifyCategory("給料", "income"), "収入", "収入 → 収入");

// ========== 集計フォーマット テスト ==========
console.log("\n📊 集計フォーマット テスト");

const testTransactions = [
    { type: "income", amount: 250000, category: "収入" },
    { type: "expense", amount: 1200, category: "食費" },
    { type: "expense", amount: 4500, category: "食費" },
    { type: "expense", amount: 70000, category: "住居費" },
    { type: "expense", amount: 8000, category: "光熱費" },
];

const summaryText = buildMonthlySummary(testTransactions, "2026-02");
assert(summaryText.includes("250,000"), "集計に総収入が含まれる");
assert(summaryText.includes("83,700"), "集計に総支出が含まれる");
assert(summaryText.includes("166,300"), "集計に残高が含まれる");
assert(summaryText.includes("食費"), "集計にカテゴリが含まれる");

// 空データ
const emptyText = buildMonthlySummary([], "2026-02");
assert(emptyText.includes("データがありません"), "空データメッセージ");

// 固定費一覧
const fixedList = buildFixedList([
    { description: "家賃", amount: 70000, type: "expense", category: "住居費" },
    { description: "電気", amount: 8000, type: "expense", category: "光熱費" },
]);
assert(fixedList.includes("家賃"), "固定費に家賃が含まれる");
assert(fixedList.includes("78,000"), "固定費合計が正しい");

// 登録メッセージ
const regMsg = buildRegistrationMessage({
    description: "ランチ",
    amount: 1200,
    type: "expense",
    category: "食費",
    is_fixed: false,
});
assert(regMsg.includes("ランチ"), "登録メッセージに説明が含まれる");
assert(regMsg.includes("1,200"), "登録メッセージに金額が含まれる");

// ========== 結果 ==========
console.log(`\n━━━━━━━━━━━━━━━`);
console.log(`結果: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    process.exit(1);
} else {
    console.log("🎉 All tests passed!\n");
}
