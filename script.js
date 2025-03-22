/* script.js */

// We'll replace d3.csv(...) with d3.text(...), so we can manually parse rows.
const dataFile = "data.csv";

d3.text(dataFile).then(function(rawText) {
  // Convert raw CSV text into an array of rows (each row is an array of column values)
  let rows = d3.csvParseRows(rawText);

  // We'll create a new array with the data we actually want
  let parsedData = [];

  rows.forEach((r) => {
    // 'r' is an array of strings for one line.
    // For example, r might look like:
    // [
    //   "Office of the President",
    //   "",
    //   "",
    //   "",
    //   "($ 70,999.60)"
    // ]

    if (!r || r.length === 0) return; // Skip empty lines

    // Let's assume the last column might be an amount if it includes '($'
    const lastCol = r[r.length - 1];
    if (lastCol && lastCol.includes("($")) {
      // Attempt to parse the last column as a negative or positive number
      // e.g. ($ 70,999.60) => -70999.60 or 70999.60, depending on how you want to handle parentheses.
      let numeric = parseFloat(lastCol.replace(/[^\d.-]/g, "")); 
      // This strips out all non-numeric characters except digits, '.' and '-'

      // Use the first column as a "Category"
      let category = r[0] ? r[0].trim() : "Unlabeled";

      // Only push if numeric is valid
      if (!isNaN(numeric)) {
        parsedData.push({
          Category: category,
          Amount: numeric,
        });
      }
    }
  });

  // Now 'parsedData' is an array of objects with {Category, Amount} for each line we recognized
  console.log("Parsed Data:", parsedData);

  // If you want to pass this data into the rest of your dashboard code, you can do so:
  // For example, pretend 'filteredData' is our final array:
  let filteredData = parsedData; // or apply additional filters if you want

  // Then we can do the same steps as your original code:
  updateSummaryMetrics(filteredData);
  updateVisualizations(filteredData);
  
  // (We define these below; basically the same logic from your original code,
  //  but we remove the d3.csv(...) call, because we’ve replaced it.)
});

// The rest of your code for updateSummaryMetrics, updateVisualizations, etc.
// Just as in your existing script, but remove the original d3.csv(...) block
// and make sure you define or copy your createBarChart, createTreemap, etc. functions.

function updateSummaryMetrics(data) {
  let total = d3.sum(data, d => d.Amount);
  let avg = d3.mean(data, d => d.Amount);
  let maxEntry = data.reduce((a, b) => a.Amount > b.Amount ? a : b, {Amount: 0, Category: "N/A"});
  document.getElementById("totalSpending").textContent = total.toFixed(2);
  document.getElementById("averageSpending").textContent = avg.toFixed(2);
  document.getElementById("maxCategory").textContent = maxEntry.Category + " ($" + maxEntry.Amount + ")";
}

function updateVisualizations(data) {
  // Group data by Category for aggregated charts
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
  populateDataTable(data);
}

// (Paste your existing createBarChart, createTreemap, createSankey, etc. below…)
// ...


// Create dropdown options based on unique categories from the data
function createFilterOptions(data) {
  const select = document.getElementById("categoryFilter");
  let categories = [...new Set(data.map(d => d.Category))];
  categories.sort();
  let option = document.createElement("option");
  option.value = "All";
  option.text = "All Categories";
  select.appendChild(option);
  categories.forEach(cat => {
    let opt = document.createElement("option");
    opt.value = cat;
    opt.text = cat;
    select.appendChild(opt);
  });
}

// Event listeners for filter dropdown and reset button
document.getElementById("categoryFilter").addEventListener("change", function() {
  let selected = this.value;
  if (selected === "All") {
    filteredData = allData;
  } else {
    filteredData = allData.filter(d => d.Category === selected);
  }
  updateSummaryMetrics(filteredData);
  updateVisualizations(filteredData);
});

document.getElementById("resetFilter").addEventListener("click", function() {
  document.getElementById("categoryFilter").value = "All";
  filteredData = allData;
  updateSummaryMetrics(filteredData);
  updateVisualizations(filteredData);
});

// Update summary metrics (total, average, highest spending)
function updateSummaryMetrics(data) {
  let total = d3.sum(data, d => d.Amount);
  let avg = d3.mean(data, d => d.Amount);
  let maxEntry = data.reduce((a, b) => a.Amount > b.Amount ? a : b, {Amount: 0, Category: "N/A"});
  document.getElementById("totalSpending").textContent = total.toFixed(2);
  document.getElementById("averageSpending").textContent = avg.toFixed(2);
  document.getElementById("maxCategory").textContent = maxEntry.Category + " ($" + maxEntry.Amount + ")";
}

// Update all visualizations based on the (filtered) data
function updateVisualizations(data) {
  // Aggregate data by category for charts that require it
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
  populateDataTable(data);
}

// Bar Chart: Spending by Category
function createBarChart(aggregatedData) {
  const trace = {
    x: aggregatedData.map(d => d.key),
    y: aggregatedData.map(d => d.value),
    type: 'bar',
    marker: { color: 'rgb(142,124,195)' }
  };
  const layout = {
    title: 'Spending by Category'
  };
  Plotly.newPlot('barChart', [trace], layout);
}

// Treemap: Visualize spending distribution hierarchically
function createTreemap(aggregatedData) {
  const treemapData = [{
    type: "treemap",
    labels: aggregatedData.map(d => d.key),
    values: aggregatedData.map(d => d.value),
    textinfo: "label+value+percent parent",
    hoverinfo: "label+value+percent parent+percent entry"
  }];
  const layout = {
    title: "Spending Treemap"
  };
  Plotly.newPlot('treemapChart', treemapData, layout);
}

// Sankey Diagram: Show flow from a "Total Budget" to individual categories
function createSankey(aggregatedData) {
  const labels = ["Total Budget"].concat(aggregatedData.map(d => d.key));
  const source = [];
  const target = [];
  const values = [];
  
  aggregatedData.forEach((d, i) => {
    source.push(0);       // "Total Budget" is the source (index 0)
    target.push(i + 1);   // Each category gets an index starting at 1
    values.push(d.value);
  });
  
  const sankeyData = {
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
  const layout = {
    title: "Sankey Diagram of Fund Flow",
    font: { size: 10 }
  };
  Plotly.newPlot('sankeyChart', [sankeyData], layout);
}

// Waterfall Chart: Display how spending amounts add up across categories
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
  const layout = {
    title: "Waterfall Chart of Spending"
  };
  Plotly.newPlot('waterfallChart', [trace], layout);
}

// Scatter/Bubble Chart: Plot individual spending data points
function createScatterChart(data) {
  const trace = {
    x: data.map(d => d.Category),
    y: data.map(d => d.Amount),
    mode: 'markers',
    marker: {
      size: data.map(d => Math.sqrt(d.Amount) * 5) // Scale bubble size appropriately
    },
    text: data.map(d => d.Category)
  };
  const layout = {
    title: "Scatter/Bubble Chart of Spending",
    xaxis: { title: "Category" },
    yaxis: { title: "Spending Amount" }
  };
  Plotly.newPlot('scatterChart', [trace], layout);
}

// Pie Chart: Show spending distribution as portions of a whole
function createPieChart(aggregatedData) {
  const trace = {
    type: "pie",
    labels: aggregatedData.map(d => d.key),
    values: aggregatedData.map(d => d.value),
    textinfo: "label+percent",
    hoverinfo: "label+value+percent"
  };
  const layout = {
    title: "Pie Chart of Spending Distribution"
  };
  Plotly.newPlot('pieChart', [trace], layout);
}

// Populate an interactive data table with raw CSV data
function populateDataTable(data) {
  const tbody = document.querySelector("#dataTable tbody");
  tbody.innerHTML = "";  // Clear any existing rows
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
