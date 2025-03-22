import { parseStructuredData } from "./parser.js";
import * as viz from "./visualizations.js";
import { showDrilldown, showDetail } from "./navigation.js";

let structuredData = [];
let drilldownStack = [];

async function loadData() {
  try {
    const response = await fetch("data.txt");
    const dataText = await response.text();
    const lines = dataText.split("\n");
    const [parsed] = parseStructuredData(lines, 0);
    structuredData = parsed;
    showHome();
  } catch (err) {
    console.error("Error loading data:", err);
  }
}

function showHome() {
  const content = document.getElementById("content");
  content.innerHTML = "<h2>Total Spending Overview</h2>";

  let grid = document.createElement("div");
  grid.className = "visualization-grid";

  // Get the BUDGET SUMMARY group.
  let budgetSummary = structuredData.find(
    node => node.level === "A" && node.name.toUpperCase().includes("BUDGET SUMMARY")
  );

  if (budgetSummary) {
    // Create visualization containers and render charts.
    let sankeyDiv = document.createElement("div");
    sankeyDiv.className = "chart-container";
    sankeyDiv.id = "sankeyDiagram";
    grid.appendChild(sankeyDiv);
    viz.createSankeyDiagram(budgetSummary);

    let treemapDiv = document.createElement("div");
    treemapDiv.className = "chart-container";
    treemapDiv.id = "categoryTreemap";
    grid.appendChild(treemapDiv);
    viz.createCategoryTreemap(structuredData);

    let gaugeDiv = document.createElement("div");
    gaugeDiv.className = "chart-container";
    gaugeDiv.id = "deficitGauge";
    grid.appendChild(gaugeDiv);
    viz.createDeficitGauge(budgetSummary);

    let barDiv = document.createElement("div");
    barDiv.className = "chart-container";
    barDiv.id = "stackedBarChart";
    grid.appendChild(barDiv);
    viz.createStackedBarChart(budgetSummary);

    let pieDiv = document.createElement("div");
    pieDiv.className = "chart-container";
    pieDiv.id = "pieChart";
    grid.appendChild(pieDiv);
    viz.createPieChart(budgetSummary);

    let bubbleDiv = document.createElement("div");
    bubbleDiv.className = "chart-container";
    bubbleDiv.id = "bubbleChart";
    grid.appendChild(bubbleDiv);
    viz.createBubbleChart(budgetSummary);

    let waterfallDiv = document.createElement("div");
    waterfallDiv.className = "chart-container";
    waterfallDiv.id = "waterfallChart";
    grid.appendChild(waterfallDiv);
    viz.createWaterfallChart(budgetSummary);

    let heatmapDiv = document.createElement("div");
    heatmapDiv.className = "chart-container";
    heatmapDiv.id = "heatmapChart";
    grid.appendChild(heatmapDiv);
    viz.createHeatmapChart(budgetSummary);

    // Additional Visualizations
    let donutDiv = document.createElement("div");
    donutDiv.className = "chart-container";
    donutDiv.id = "donutChart";
    grid.appendChild(donutDiv);
    viz.createDonutChart(budgetSummary);

    let lineDiv = document.createElement("div");
    lineDiv.className = "chart-container";
    lineDiv.id = "lineChart";
    grid.appendChild(lineDiv);
    viz.createLineChart(budgetSummary);
  }

  content.appendChild(grid);

  // Add interactive Data Explorer table.
  let interactiveSection = document.createElement("div");
  interactiveSection.id = "interactiveSection";
  interactiveSection.innerHTML = "<h2>Data Explorer</h2>";
  let table = document.createElement("table");
  table.id = "dataTable";
  let thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Level</th><th>Name</th><th>Value</th></tr>";
  table.appendChild(thead);
  let tbody = document.createElement("tbody");
  let flatData = flattenData(structuredData);
  flatData.forEach(item => {
    let tr = document.createElement("tr");
    tr.innerHTML = `<td>${item.level}</td><td>${item.name}</td><td>${
      item.value !== undefined ? "$" + Math.abs(item.value).toLocaleString() : ""
    }</td>`;
    tr.addEventListener("click", () => {
      showDetail(item, []);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  interactiveSection.appendChild(table);
  content.appendChild(interactiveSection);
}

function flattenData(data) {
  let flat = [];
  data.forEach(item => {
    flat.push(item);
    if (item.children && item.children.length > 0) {
      flat = flat.concat(flattenData(item.children));
    }
  });
  return flat;
}

// Search functionality for the Data Explorer.
document.getElementById("searchInput").addEventListener("input", (e) => {
  let query = e.target.value.toLowerCase();
  let rows = document.querySelectorAll("#dataTable tbody tr");
  rows.forEach(row => {
    let nameCell = row.children[1].textContent.toLowerCase();
    row.style.display = nameCell.includes(query) ? "" : "none";
  });
});

// Navigation buttons.
document.getElementById("homeBtn").addEventListener("click", () => {
  drilldownStack = [];
  showHome();
});
document.getElementById("drilldownBtn").addEventListener("click", () => {
  drilldownStack = [];
  showDrilldown({ name: "All Categories", children: structuredData }, drilldownStack);
});

// Listen for custom event to return home.
window.addEventListener("homeRequested", () => {
  drilldownStack = [];
  showHome();
});

document.addEventListener("DOMContentLoaded", loadData);
