/* script.js */

// Global variables to store the full dataset and currently filtered data
let allData = [];
let filteredData = [];

// CSV file path
const dataFile = "data.csv";

// Load and parse CSV data
d3.text(dataFile).then(function(rawText) {
  // Convert raw CSV text into an array of rows (each row is an array of column values)
  let rows = d3.csvParseRows(rawText);
  let parsedData = [];

  rows.forEach((r) => {
    if (!r || r.length === 0) return; // Skip empty lines

    // Assume the last column might be an amount if it includes '($'
    const lastCol = r[r.length - 1];
    if (lastCol && lastCol.includes("($")) {
      // Parse the last column as a numeric value (parentheses indicate a negative number)
      let numeric = parseFloat(lastCol.replace(/[^\d.-]/g, ""));
      let category = r[0] ? r[0].trim() : "Unlabeled";
      if (!isNaN(numeric)) {
        parsedData.push({
          Category: category,
          Amount: numeric,
        });
      }
    }
  });

  // Set global variables for the full dataset and initialize filteredData
  allData = parsedData;
  filteredData = allData;

  console.log("Parsed Data:", allData);

  // Populate the filter dropdown options
  createFilterOptions(allData);

  // Update the dashboard with the initial full dataset
  updateSummaryMetrics(filteredData);
  updateVisualizations(filteredData);
});

// Create dropdown options based on unique categories from the data
function createFilterOptions(data) {
  const select = document.getElementById("categoryFilter");
  // Clear any existing options
  select.innerHTML = "";
  let categories = [...new Set(data.map(d => d.Category))];
  categories.sort();
  
  // Create "All Categories" option
  let allOption = document.createElement("option");
  allOption.value = "All";
  allOption.text = "All Categories";
  select.appendChild(allOption);
  
  // Create an option for each category
  categories.forEach(cat => {
    let opt = document.createElement("option");
    opt.value = cat;
    opt.text = cat;
    select.appendChild(opt);
  });
}

// Update summary metrics (total, average, highest spending)
function updateSummaryMetrics(data) {
  let total = d3.sum(data, d => d.Amount);
  let avg = d3.mean(data, d => d.Amount);
  let maxEntry = data.reduce((a, b) => a.Amount > b.Amount ? a : b, {Amount: 0, Category: "N/A"});
  document.getElementById("totalSpending").textContent = total.toFixed(2);
  document.getElementById("averageSpending").textContent = avg.toFixed(2);
  document.getElementById("maxCategory").textContent = maxEntry.Category + " ($" + maxEntry.Amount.toFixed(2) + ")";
}

// Update all visualizations based on the (filtered) data
function updateVisualizations(data) {
  // Aggregate data by Category for visualizations that need it
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

// Event listener for filter dropdown
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

// Event listener for the reset filter button
document.getElementById("resetFilter").addEventListener("click", function() {
  document.getElementById("categoryFilter").value = "All";
  filteredData = allData;
  updateSummaryMetrics(filteredData);
  updateVisualizations(filteredData);
});

// Visualization Functions

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
      size: data.map(d => Math.sqrt(Math.abs(d.Amount)) * 5) // Scale bubble size (ensure positive sizes)
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
  tbody.innerHTML = "";  // Clear existing rows
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
