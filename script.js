/* script.js */

// Global variables to store full and filtered datasets
let allData = [];
let filteredData = [];

// CSV file path
const dataFile = "data.csv";

// Load and parse CSV data
d3.text(dataFile).then(function(rawText) {
  const rows = d3.csvParseRows(rawText);
  let parsedData = [];
  
  rows.forEach(r => {
    if (!r || r.length === 0) return;
    // Assume the last column contains an amount when it includes '($'
    const lastCol = r[r.length - 1];
    if (lastCol && lastCol.includes("($")) {
      let numeric = parseFloat(lastCol.replace(/[^\d.-]/g, ""));
      let category = r[0] ? r[0].trim() : "Unlabeled";
      if (!isNaN(numeric)) {
        parsedData.push({ Category: category, Amount: numeric });
      }
    }
  });
  
  allData = parsedData;
  filteredData = allData;
  console.log("Parsed Data:", allData);
  
  createFilterOptions(allData);
  updateSummaryMetrics(filteredData);
  updateVisualizations(filteredData);
});

// Create filter dropdown options
function createFilterOptions(data) {
  const select = document.getElementById("categoryFilter");
  select.innerHTML = "";
  let categories = [...new Set(data.map(d => d.Category))];
  categories.sort();
  
  let allOption = document.createElement("option");
  allOption.value = "All";
  allOption.text = "All Categories";
  select.appendChild(allOption);
  
  categories.forEach(cat => {
    let opt = document.createElement("option");
    opt.value = cat;
    opt.text = cat;
    select.appendChild(opt);
  });
}

// Update summary metrics
function updateSummaryMetrics(data) {
  let total = d3.sum(data, d => d.Amount);
  let avg = d3.mean(data, d => d.Amount);
  let maxEntry = data.reduce((a, b) => a.Amount > b.Amount ? a : b, {Amount: 0, Category: "N/A"});
  
  document.getElementById("totalSpending").textContent = total.toFixed(2);
  document.getElementById("averageSpending").textContent = avg.toFixed(2);
  document.getElementById("maxCategory").textContent = `${maxEntry.Category} ($${maxEntry.Amount.toFixed(2)})`;
}

// Update all visualizations
function updateVisualizations(data) {
  const aggregatedData = d3.nest()
    .key(d => d.Category)
    .rollup(v => d3.sum(v, d => d.Amount))
    .entries(data);
    
  createBarChart(aggregatedData);
  createTreemap(aggregatedData);
  createSankey(aggregatedData);
  createWaterfall(aggregatedData);
  createScatterChart(data);
  createPieChart(aggregatedData);
  createHistogram(data);
  createBoxPlot(data);
  createDonutChart(aggregatedData);
  populateDataTable(data);
}

// Event listeners for filtering
document.getElementById("categoryFilter").addEventListener("change", function() {
  const selected = this.value;
  filteredData = (selected === "All") ? allData : allData.filter(d => d.Category === selected);
  updateSummaryMetrics(filteredData);
  updateVisualizations(filteredData);
});
document.getElementById("resetFilter").addEventListener("click", function() {
  document.getElementById("categoryFilter").value = "All";
  filteredData = allData;
  updateSummaryMetrics(filteredData);
  updateVisualizations(filteredData);
});

// Download CSV button functionality
document.getElementById("downloadData").addEventListener("click", function() {
  let csvContent = "data:text/csv;charset=utf-8,Category,Amount\n";
  filteredData.forEach(row => {
    csvContent += `${row.Category},${row.Amount}\n`;
  });
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "filtered_data.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// ----------------- Visualization Functions -----------------

// Bar Chart: Spending by Category
function createBarChart(aggregatedData) {
  const trace = {
    x: aggregatedData.map(d => d.key),
    y: aggregatedData.map(d => d.value),
    type: 'bar',
    marker: { color: 'rgb(142,124,195)' }
  };
  const layout = { title: 'Spending by Category', margin: { t: 40 } };
  Plotly.newPlot('barChart', [trace], layout, { responsive: true });
}

// Treemap: Hierarchical Spending Distribution
function createTreemap(aggregatedData) {
  const dataTrace = [{
    type: "treemap",
    labels: aggregatedData.map(d => d.key),
    values: aggregatedData.map(d => d.value),
    textinfo: "label+value+percent parent",
    hoverinfo: "label+value+percent parent+percent entry"
  }];
  const layout = { title: "Spending Treemap", margin: { t: 40 } };
  Plotly.newPlot('treemapChart', dataTrace, layout, { responsive: true });
}

// Sankey Diagram: Fund Flow from Total Budget to Categories
function createSankey(aggregatedData) {
  const labels = ["Total Budget"].concat(aggregatedData.map(d => d.key));
  const source = [];
  const target = [];
  const values = [];
  aggregatedData.forEach((d, i) => {
    source.push(0);
    target.push(i + 1);
    values.push(d.value);
  });
  const dataTrace = {
    type: "sankey",
    orientation: "h",
    node: {
      pad: 15,
      thickness: 20,
      line: { color: "black", width: 0.5 },
      label: labels
    },
    link: {
      source: source,
      target: target,
      value: values
    }
  };
  const layout = { title: "Sankey Diagram of Fund Flow", font: { size: 10 }, margin: { t: 40 } };
  Plotly.newPlot('sankeyChart', [dataTrace], layout, { responsive: true });
}

// Waterfall Chart: Cumulative Spending Impact
function createWaterfall(aggregatedData) {
  const measures = aggregatedData.map(() => "relative");
  const trace = {
    type: "waterfall",
    x: aggregatedData.map(d => d.key),
    y: aggregatedData.map(d => d.value),
    measure: measures,
    textposition: "outside",
    text: aggregatedData.map(d => d.value)
  };
  const layout = { title: "Waterfall Chart of Spending", margin: { t: 40 } };
  Plotly.newPlot('waterfallChart', [trace], layout, { responsive: true });
}

// Scatter/Bubble Chart: Individual Spending Data Points
function createScatterChart(data) {
  const trace = {
    x: data.map(d => d.Category),
    y: data.map(d => d.Amount),
    mode: 'markers',
    marker: { size: data.map(d => Math.sqrt(Math.abs(d.Amount)) * 5) },
    text: data.map(d => d.Category)
  };
  const layout = {
    title: "Scatter/Bubble Chart of Spending",
    xaxis: { title: "Category" },
    yaxis: { title: "Spending Amount" },
    margin: { t: 40 }
  };
  Plotly.newPlot('scatterChart', [trace], layout, { responsive: true });
}

// Pie Chart: Spending as a Portion of the Whole
function createPieChart(aggregatedData) {
  const trace = {
    type: "pie",
    labels: aggregatedData.map(d => d.key),
    values: aggregatedData.map(d => d.value),
    textinfo: "label+percent",
    hoverinfo: "label+value+percent"
  };
  const layout = { title: "Pie Chart of Spending Distribution", margin: { t: 40 } };
  Plotly.newPlot('pieChart', [trace], layout, { responsive: true });
}

// Histogram: Distribution of Spending Amounts
function createHistogram(data) {
  const trace = {
    x: data.map(d => d.Amount),
    type: "histogram",
    marker: { color: 'rgb(100, 149, 237)' }
  };
  const layout = {
    title: "Histogram of Spending Amounts",
    xaxis: { title: "Amount" },
    yaxis: { title: "Frequency" },
    margin: { t: 40 }
  };
  Plotly.newPlot('histogramChart', [trace], layout, { responsive: true });
}

// Box Plot: Spending Distribution by Category
function createBoxPlot(data) {
  const categories = [...new Set(data.map(d => d.Category))];
  const traces = categories.map(cat => {
    const amounts = data.filter(d => d.Category === cat).map(d => d.Amount);
    return { y: amounts, type: 'box', name: cat };
  });
  const layout = {
    title: "Box Plot of Spending Amounts by Category",
    yaxis: { title: "Amount" },
    margin: { t: 40 }
  };
  Plotly.newPlot('boxPlotChart', traces, layout, { responsive: true });
}

// Donut Chart: A Variation on the Pie Chart
function createDonutChart(aggregatedData) {
  const trace = {
    type: "pie",
    labels: aggregatedData.map(d => d.key),
    values: aggregatedData.map(d => d.value),
    hole: 0.4,
    textinfo: "label+percent",
    hoverinfo: "label+value+percent"
  };
  const layout = { title: "Donut Chart of Spending Breakdown", margin: { t: 40 } };
  Plotly.newPlot('donutChart', [trace], layout, { responsive: true });
}

// Data Table: Populate raw CSV data
function populateDataTable(data) {
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";
  data.forEach(d => {
    const tr = document.createElement("tr");
    const categoryTd = document.createElement("td");
    categoryTd.textContent = d.Category;
    tr.appendChild(categoryTd);
    const amountTd = document.createElement("td");
    amountTd.textContent = d.Amount;
    tr.appendChild(amountTd);
    tbody.appendChild(tr);
  });
}
