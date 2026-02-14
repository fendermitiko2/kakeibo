/**
 * 残高推移グラフ表示エンドポイント
 * URL: /api/balance-chart?months=2025-12,2026-01,2026-02&balances=50000,120000,166300
 */
module.exports = async function handler(req, res) {
    const { months, balances } = req.query;

    if (!months || !balances) {
        return res.status(400).send("Missing months or balances");
    }

    const monthList = decodeURIComponent(months).split(",");
    const balanceList = decodeURIComponent(balances).split(",").map(Number);

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>残高推移</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif;
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      color: #fff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 20px;
      text-align: center;
      background: linear-gradient(90deg, #36A2EB, #4BC0C0);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .chart-container {
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 24px 16px;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
    }
    canvas { width: 100% !important; }
    .summary {
      margin-top: 20px;
      width: 100%;
      max-width: 500px;
    }
    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 16px;
      margin-bottom: 6px;
      background: rgba(255,255,255,0.06);
      border-radius: 12px;
      font-size: 14px;
    }
    .label { color: #aaa; }
    .value { font-weight: 600; }
    .positive { color: #4BC0C0; }
    .negative { color: #FF6384; }
  </style>
</head>
<body>
  <h1>📈 残高推移</h1>
  <div class="chart-container">
    <canvas id="lineChart"></canvas>
  </div>
  <div class="summary" id="summary"></div>

  <script>
    const months = ${JSON.stringify(monthList)};
    const balances = ${JSON.stringify(balanceList)};

    // 月ラベルを短縮表示 (2026-02 → 2/26)
    const shortLabels = months.map(m => {
      const [y, mo] = m.split('-');
      return parseInt(mo) + '/' + y.slice(2);
    });

    const ctx = document.getElementById('lineChart').getContext('2d');

    // グラデーション
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(54, 162, 235, 0.3)');
    gradient.addColorStop(1, 'rgba(54, 162, 235, 0.01)');

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: shortLabels,
        datasets: [{
          label: '残高',
          data: balances,
          borderColor: '#36A2EB',
          backgroundColor: gradient,
          borderWidth: 3,
          pointBackgroundColor: '#36A2EB',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8,
          fill: true,
          tension: 0.3,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                return '¥' + context.parsed.y.toLocaleString();
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#aaa', font: { size: 12 } },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          y: {
            ticks: {
              color: '#aaa',
              font: { size: 11 },
              callback: function(value) {
                if (Math.abs(value) >= 10000) return '¥' + (value / 10000).toFixed(0) + '万';
                return '¥' + value.toLocaleString();
              }
            },
            grid: { color: 'rgba(255,255,255,0.05)' },
          }
        }
      }
    });

    // サマリー
    const summaryEl = document.getElementById('summary');
    const latest = balances[balances.length - 1];
    const prev = balances.length >= 2 ? balances[balances.length - 2] : 0;
    const diff = latest - prev;
    const diffClass = diff >= 0 ? 'positive' : 'negative';
    const diffSign = diff >= 0 ? '+' : '';

    summaryEl.innerHTML =
      '<div class="summary-item">' +
        '<span class="label">現在の残高</span>' +
        '<span class="value ' + (latest >= 0 ? 'positive' : 'negative') + '">¥' + latest.toLocaleString() + '</span>' +
      '</div>' +
      (balances.length >= 2 ?
        '<div class="summary-item">' +
          '<span class="label">前月比</span>' +
          '<span class="value ' + diffClass + '">' + diffSign + '¥' + diff.toLocaleString() + '</span>' +
        '</div>' : ''
      );
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
};
