/**
 * Chart.js 円グラフ表示エンドポイント
 * URL: /api/chart?labels=食費,交通費&values=120000,35000&title=支出分析
 */
module.exports = async function handler(req, res) {
    const { labels, values, title } = req.query;

    if (!labels || !values) {
        return res.status(400).send("Missing labels or values");
    }

    const labelList = decodeURIComponent(labels).split(",");
    const valueList = decodeURIComponent(values).split(",").map(Number);
    const chartTitle = decodeURIComponent(title || "支出内訳");

    // 美しい配色パレット
    const colors = [
        "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
        "#FF9F40", "#E7E9ED", "#7BC8A4", "#F67280", "#C06C84",
        "#6C5B7B", "#355C7D", "#F8B500", "#FC5185", "#3FC1C9",
    ];

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${chartTitle}</title>
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
      background: linear-gradient(90deg, #36A2EB, #FF6384);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .chart-container {
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 24px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
    }
    canvas { width: 100% !important; }
    .legend {
      margin-top: 20px;
      width: 100%;
      max-width: 400px;
    }
    .legend-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      margin-bottom: 6px;
      background: rgba(255,255,255,0.06);
      border-radius: 12px;
      font-size: 14px;
    }
    .legend-left { display: flex; align-items: center; gap: 10px; }
    .legend-dot {
      width: 12px; height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .legend-amount { font-weight: 600; color: #ccc; }
  </style>
</head>
<body>
  <h1>${chartTitle}</h1>
  <div class="chart-container">
    <canvas id="pieChart"></canvas>
  </div>
  <div class="legend" id="legend"></div>

  <script>
    const labels = ${JSON.stringify(labelList)};
    const values = ${JSON.stringify(valueList)};
    const colors = ${JSON.stringify(colors.slice(0, labelList.length))};
    const total = values.reduce((a, b) => a + b, 0);

    const ctx = document.getElementById('pieChart').getContext('2d');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(context) {
                const v = context.parsed;
                const pct = ((v / total) * 100).toFixed(1);
                return context.label + ': ¥' + v.toLocaleString() + ' (' + pct + '%)';
              }
            }
          }
        },
        cutout: '55%',
      }
    });

    // カスタムレジェンド
    const legendEl = document.getElementById('legend');
    labels.forEach((label, i) => {
      const pct = ((values[i] / total) * 100).toFixed(1);
      legendEl.innerHTML += '<div class="legend-item">' +
        '<span class="legend-left">' +
          '<span class="legend-dot" style="background:' + colors[i] + '"></span>' +
          '<span>' + label + ' (' + pct + '%)</span>' +
        '</span>' +
        '<span class="legend-amount">¥' + values[i].toLocaleString() + '</span>' +
      '</div>';
    });
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
};
