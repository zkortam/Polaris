// main.js
import { parseStructuredData } from "./parser.js";
import { createSankeyDiagram, createCategoryTreemap, createDeficitGauge,
         createStackedBarChart, createPieChart, createBubbleChart, createWaterfallChart, createHeatmapChart } from "./visualizations.js";
import { showDrilldown, showDetail } from "./navigation.js";

let structuredData = [];
let drilldownStack = [];

// Load data using async/await.
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
  
  // Get BUDGET SUMMARY group.
  let budgetSummary = structuredData.find(
    node => node.level === "A" && node.name.toUpperCase().includes("BUDGET SUMMARY")
  );
  
  // Create multiple chart containers.
  // 1. Sankey Diagram
  let sankeyDiv = document.createElement("div");
  sankeyDiv.className = "chart-container";
  sankeyDiv.id = "sankeyDiagram";
  grid.appendChild(sankeyDiv);
  createSankeyDiagram(budgetSummary);
  
  // 2. Treemap
  let treemapDiv = document.createElement("div");
  treemapDiv.className = "chart-container";
  treemapDiv.id = "categoryTreemap";
  grid.appendChild(treemapDiv);
  createCategoryTreemap(structuredData);
  
  // 3. Deficit Gauge
  let gaugeDiv = document.createElement("div");
  gaugeDiv.className = "chart-container gauge-container";
  gaugeDiv.id = "deficitGauge";
  grid.appendChild(gaugeDiv);
  createDeficitGauge(budgetSummary);
  
  // 4. Stacked Bar Chart
  let barDiv = document.createElement("div");
  barDiv.className = "chart-container";
  barDiv.id = "stackedBarChart";
  grid.appendChild(barDiv);
  createStackedBarChart(budgetSummary);
  
  // 5. Pie Chart
  let pieDiv = document.createElement("div");
  pieDiv.className = "chart-container";
  pieDiv.id = "pieChart";
  grid.appendChild(pieDiv);
  createPieChart(budgetSummary);
  
  // 6. Bubble Chart
  let bubbleDiv = document.createElement("div");
  bubbleDiv.className = "chart-container";
  bubbleDiv.id = "bubbleChart";
  grid.appendChild(bubbleDiv);
  createBubbleChart(budgetSummary);
  
  // 7. Waterfall Chart
  let waterfallDiv = document.createElement("div");
  waterfallDiv.className = "chart-container";
  waterfallDiv.id = "waterfallChart";
  grid.appendChild(waterfallDiv);
  createWaterfallChart(budgetSummary);
  
  // 8. Heatmap Chart
  let heatmapDiv = document.createElement("div");
  heatmapDiv.className = "chart-container";
  heatmapDiv.id = "heatmapChart";
  grid.appendChild(heatmapDiv);
  createHeatmapChart(budgetSummary);
  
  content.appendChild(grid);
  let info = document.createElement("p");
  info.innerHTML = "Use the navigation buttons above to explore detailed breakdowns.";
  content.appendChild(info);
}

// Set up navigation buttons.
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

// Start loading data.
document.addEventListener("DOMContentLoaded", loadData);
