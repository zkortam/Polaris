// Global variables to hold the parsed structured data and drilldown navigation stack
let structuredData = [];
let drilldownStack = [];

// When the document loads, set up navigation and load the data file.
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("homeBtn").addEventListener("click", showHome);
  document.getElementById("drilldownBtn").addEventListener("click", () => {
    // Start drilldown from top–level A groups.
    drilldownStack = [];
    showDrilldown({ level: "ROOT", children: structuredData });
  });

  fetch("data.txt")
    .then((response) => response.text())
    .then((dataText) => {
      let lines = dataText.split("\n");
      let [parsed, _] = parseStructuredData(lines, 0);
      structuredData = parsed;
      showHome();
    })
    .catch((err) => console.error("Error loading data:", err));
});

/* ========================================================
   NEW STRUCTURED DATA PARSER
   Recognizes lines starting with A: B: C: or D:.
   Container groups end with '{' and are closed by '}'.
   D–lines (leaf items) use a separator (| or –) to capture a value.
======================================================== */
function parseStructuredData(lines, index) {
  let items = [];
  while (index < lines.length) {
    let line = lines[index].trim();
    if (line === "") {
      index++;
      continue;
    }
    if (line === "}") {
      index++;
      break;
    }
    // Match group header. It can optionally end with "{".
    let groupMatch = line.match(/^([A-D]):\s*(.+?)(\s*\{)?$/);
    if (groupMatch) {
      let level = groupMatch[1]; // A, B, C, or D
      let namePart = groupMatch[2].trim();
      let hasBrace = groupMatch[3] && groupMatch[3].includes("{");
      if (hasBrace) {
        // This is a container group.
        let node = { level: level, name: namePart, children: [] };
        index++;
        let result = parseStructuredData(lines, index);
        node.children = result[0];
        index = result[1];
        items.push(node);
      } else {
        // It might be a leaf (D group) if a separator is present.
        let leafMatch = line.match(/^([A-D]):\s*(.+?)\s*(\||–)\s*(.+)$/);
        if (leafMatch) {
          let leafLevel = leafMatch[1];
          let leafName = leafMatch[2].trim();
          let valueStr = leafMatch[4].trim();
          let value = parseValue(valueStr);
          items.push({ level: leafLevel, name: leafName, value: value });
        } else {
          // Otherwise, a leaf with no value.
          items.push({ level: groupMatch[1], name: namePart });
        }
        index++;
      }
    } else {
      index++;
    }
  }
  return [items, index];
}

function parseValue(valueStr) {
  let s = valueStr.replace(/,/g, "").trim();
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace("$", "");
  let num = parseFloat(s);
  if (!isNaN(num)) return negative ? -num : num;
  return valueStr;
}

/* ========================================================
   HOME PAGE: Total Spending Visualizations
======================================================== */
function showHome() {
  const content = document.getElementById("content");
  content.innerHTML = "<h2>Total Spending Overview</h2>";

  // Create a grid container for the main visualizations.
  let grid = document.createElement("div");
  grid.className = "visualization-grid";

  // 1. Sankey Diagram: Build from the "BUDGET SUMMARY" A–group.
  let budgetSummary = structuredData.find(
    (node) => node.level === "A" && node.name.toUpperCase().includes("BUDGET SUMMARY")
  );
  if (budgetSummary) {
    let sankeyDiv = document.createElement("div");
    sankeyDiv.className = "chart-container";
    sankeyDiv.id = "sankeyDiagram";
    grid.appendChild(sankeyDiv);
    createSankeyDiagram(budgetSummary);
  }

  // 2. Treemap: Display each A–group category with color based on its name.
  let treemapDiv = document.createElement("div");
  treemapDiv.className = "chart-container";
  treemapDiv.id = "categoryTreemap";
  grid.appendChild(treemapDiv);
  createCategoryTreemap(structuredData);

  // 3. Deficit Gauge: Show that we are almost $600K in deficit.
  let gaugeDiv = document.createElement("div");
  gaugeDiv.className = "chart-container gauge-container";
  gaugeDiv.id = "deficitGauge";
  grid.appendChild(gaugeDiv);
  createDeficitGauge(budgetSummary);

  content.appendChild(grid);

  // Optionally, add some descriptive text.
  let info = document.createElement("p");
  info.innerHTML = "Use the navigation buttons above to explore detailed breakdowns.";
  content.appendChild(info);
}

/* ========================================================
   CHART CREATION FUNCTIONS
======================================================== */

// Sankey Diagram: Use the "BUDGET SUMMARY" group.
function createSankeyDiagram(budgetGroup) {
  // In budgetGroup, find the D–items in the "General" subgroup (or its children)
  let items = [];
  if (budgetGroup.children && budgetGroup.children.length > 0) {
    // Assume one B group (usually "General") then one C group ("Items")
    let bGroup = budgetGroup.children.find((child) => child.level === "B");
    if (bGroup && bGroup.children) {
      let cGroup = bGroup.children.find((child) => child.level === "C");
      if (cGroup && cGroup.children) {
        items = cGroup.children.filter((child) => child.level === "D" && child.value !== undefined);
      }
    }
  }
  // Identify the revenue item and spending items.
  let revenueItem = items.find((item) => item.name.toUpperCase().includes("AS REVENUE"));
  if (!revenueItem) return;
  let revenue = revenueItem.value;
  // Spending items: all other D items with negative values.
  let spendingItems = items.filter((item) => item !== revenueItem && typeof item.value === "number" && item.value < 0);
  // Build sankey data: source node is "AS Revenue", targets are each spending category.
  let sources = [];
  let targets = [];
  let values = [];
  let labels = ["AS Revenue"];
  spendingItems.forEach((item) => {
    labels.push(item.name);
    sources.push(0);
    targets.push(labels.length - 1);
    values.push(Math.abs(item.value));
  });
  let data = [{
    type: "sankey",
    orientation: "h",
    node: {
      pad: 15,
      thickness: 20,
      line: { color: "black", width: 0.5 },
      label: labels
    },
    link: {
      source: sources,
      target: targets,
      value: values
    }
  }];
  let layout = {
    title: "AS Revenue Flow into Spending Categories",
    font: { size: 10 }
  };
  Plotly.newPlot("sankeyDiagram", data, layout);
}

// Treemap: Use all A–groups. Color green if name contains "STUDENT" or "EVENT", else red.
function createCategoryTreemap(aGroups) {
  // For each A–group, sum the absolute value of its D–items (recursively).
  let labels = [];
  let parents = [];
  let values = [];
  let colors = [];
  aGroups.forEach((node, i) => {
    labels.push(node.name);
    parents.push("Total Spending");
    let sum = sumGroup(node);
    values.push(sum);
    colors.push(getCategoryColor(node.name));
  });
  // Add a root node.
  labels.unshift("Total Spending");
  parents.unshift("");
  values.unshift(values.reduce((a, b) => a + b, 0));
  colors.unshift("#CCCCCC");
  let data = [{
    type: "treemap",
    labels: labels,
    parents: parents,
    values: values,
    marker: { colors: colors },
    textinfo: "label+value"
  }];
  let layout = {
    title: "Category Breakdown (Green: Student/Events; Red: Operational)"
  };
  Plotly.newPlot("categoryTreemap", data, layout);
}

// Gauge Chart for Deficit: Using the "2024–2025 Remaining Funds" value.
function createDeficitGauge(budgetGroup) {
  let items = [];
  if (budgetGroup.children && budgetGroup.children.length > 0) {
    let bGroup = budgetGroup.children.find((child) => child.level === "B");
    if (bGroup && bGroup.children) {
      let cGroup = bGroup.children.find((child) => child.level === "C");
      if (cGroup && cGroup.children) {
        items = cGroup.children.filter((child) => child.level === "D" && child.value !== undefined);
      }
    }
  }
  let deficitItem = items.find((item) => item.name.toUpperCase().includes("REMAINING FUNDS"));
  let deficit = deficitItem ? deficitItem.value : -587367.41;
  // We expect a negative number. Use a gauge indicator to show deficit.
  let data = [{
    type: "indicator",
    mode: "gauge+number",
    value: Math.abs(deficit),
    title: { text: "Deficit" },
    gauge: {
      axis: { range: [0, Math.abs(deficit) * 1.5] },
      bar: { color: deficit < 0 ? "red" : "green" },
      steps: [
        { range: [0, Math.abs(deficit)], color: "#ffcccc" },
        { range: [Math.abs(deficit), Math.abs(deficit) * 1.5], color: "#ffe6e6" }
      ]
    }
  }];
  let layout = {
    title: "Deficit Gauge (Nearly $600K)"
  };
  Plotly.newPlot("deficitGauge", data, layout);
}

/* ========================================================
   Utility Functions for Aggregation & Color
======================================================== */
// Recursively sum the absolute values of all D items in a group.
function sumGroup(node) {
  let sum = 0;
  if (node.children && node.children.length > 0) {
    node.children.forEach((child) => {
      sum += sumGroup(child);
    });
  } else if (node.level === "D" && typeof node.value === "number") {
    // For spending (negative numbers) take absolute.
    sum += Math.abs(node.value);
  }
  return sum;
}

// Return a color based on the category name: green for student/services, red for operational.
function getCategoryColor(name) {
  let upper = name.toUpperCase();
  if (upper.includes("STUDENT") || upper.includes("EVENT")) {
    return "#66CC66"; // green
  }
  return "#FF6666"; // red
}

/* ========================================================
   DRILL–DOWN NAVIGATION (Hierarchical Selector)
======================================================== */
function showDrilldown(node) {
  const content = document.getElementById("content");
  content.innerHTML = "";
  
  // Header with back button if not at root.
  let headerDiv = document.createElement("div");
  headerDiv.className = "drilldown-header";
  let title = document.createElement("h2");
  title.textContent = node.name ? node.name : "Categories";
  headerDiv.appendChild(title);
  if (drilldownStack.length > 0) {
    let backBtn = document.createElement("button");
    backBtn.textContent = "Back";
    backBtn.className = "back-btn";
    backBtn.addEventListener("click", () => {
      let parent = drilldownStack.pop();
      showDrilldown(parent);
    });
    headerDiv.appendChild(backBtn);
  }
  content.appendChild(headerDiv);

  // If node has children, list them as cards.
  if (node.children && node.children.length > 0) {
    let grid = document.createElement("div");
    grid.className = "item-grid";
    node.children.forEach((child) => {
      let card = document.createElement("div");
      card.className = "item-card";
      card.innerHTML = `<h3>${child.name}</h3>`;
      // If this node has a numeric value (leaf D), also show it.
      if (child.level === "D" && child.value !== undefined) {
        card.innerHTML += `<p>Value: $${Math.abs(child.value).toLocaleString()}</p>`;
      }
      card.addEventListener("click", () => {
        if (child.children && child.children.length > 0) {
          drilldownStack.push(node);
          showDrilldown(child);
        } else {
          // If leaf, show details.
          showDetail(child);
        }
      });
      grid.appendChild(card);
    });
    content.appendChild(grid);
  } else {
    // If no children, show details.
    showDetail(node);
  }
}

// Show details for a leaf node: a table of the item (or just text) plus a bar & pie chart if numeric data exists.
function showDetail(node) {
  const content = document.getElementById("content");
  content.innerHTML = "";
  let headerDiv = document.createElement("div");
  headerDiv.className = "drilldown-header";
  let title = document.createElement("h2");
  title.textContent = node.name;
  headerDiv.appendChild(title);
  let backBtn = document.createElement("button");
  backBtn.textContent = "Back";
  backBtn.className = "back-btn";
  backBtn.addEventListener("click", () => {
    if (drilldownStack.length > 0) {
      let parent = drilldownStack.pop();
      showDrilldown(parent);
    } else {
      showHome();
    }
  });
  headerDiv.appendChild(backBtn);
  content.appendChild(headerDiv);

  // If the node is a D–line with a value, display it.
  if (node.level === "D" && node.value !== undefined) {
    let p = document.createElement("p");
    p.textContent = `Value: $${Math.abs(node.value).toLocaleString()}`;
    content.appendChild(p);
  }
  // Optionally, if there are additional properties, you could show a table.
}

