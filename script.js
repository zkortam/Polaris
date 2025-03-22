let parsedData = [];

document.addEventListener("DOMContentLoaded", () => {
  // Set up navigation
  document.getElementById("homeBtn").addEventListener("click", showHome);
  document.getElementById("reviewBtn").addEventListener("click", showExecutiveReview);

  // Load and parse the data file
  fetch("data.txt")
    .then((response) => response.text())
    .then((dataText) => {
      parsedData = parseData(dataText);
      showHome();
    })
    .catch((err) => console.error("Error loading data:", err));
});

/* ============================
   Data Parsing Functions
   ----------------------------
   The parser reads your custom file format:
   – A block starts with a header like "[SECTION NAME] {"
   – Key–value pairs use "|" or "–" as a separator.
   – Blocks can nest.
============================ */
function parseData(dataText) {
  const lines = dataText.split("\n");
  let blocks = [];
  let index = 0;
  while (index < lines.length) {
    let line = lines[index].trim();
    if (line === "") {
      index++;
      continue;
    }
    let headerMatch = line.match(/^\[+(.+?)\]+\s*\{$/);
    if (headerMatch) {
      let blockName = headerMatch[1].trim();
      let [block, nextIndex] = parseBlock(lines, index + 1);
      block.name = blockName;
      blocks.push(block);
      index = nextIndex;
    } else {
      index++;
    }
  }
  return blocks;
}

function parseBlock(lines, index) {
  let block = { type: "block", name: "", children: [] };
  while (index < lines.length) {
    let line = lines[index].trim();
    if (line === "") {
      index++;
      continue;
    }
    if (line === "}") {
      return [block, index + 1];
    }
    let blockHeaderMatch = line.match(/^\[+(.+?)\]+\s*\{$/);
    if (blockHeaderMatch) {
      let blockName = blockHeaderMatch[1].trim();
      let [childBlock, nextIndex] = parseBlock(lines, index + 1);
      childBlock.name = blockName;
      block.children.push(childBlock);
      index = nextIndex;
      continue;
    }
    let kvMatch = line.match(/^(.*?)\s*(\||–)\s*(.*?)$/);
    if (kvMatch) {
      let key = kvMatch[1].trim();
      let rawValue = kvMatch[3].trim();
      let value = parseValue(rawValue);
      block.children.push({ type: "entry", key: key, value: value });
    } else {
      block.children.push({ type: "text", content: line });
    }
    index++;
  }
  return [block, index];
}

function parseValue(valueStr) {
  let s = valueStr.trim().replace(/,/g, "");
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

/* ============================
   Helper Functions
============================ */
// Find a block whose name contains the given fragment.
function getBlockByName(blocks, fragment) {
  for (let block of blocks) {
    if (block.name && block.name.toUpperCase().includes(fragment.toUpperCase())) {
      return block;
    }
  }
  return null;
}

// Extract a total value from the block’s title (if present, e.g., "CAREER EMPLOYEES: $1,777,457.00")
function getTotalFromBlockTitle(block) {
  let match = block.name.match(/\$([\d.,]+)/);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ""));
  }
  return null;
}

// Sum all numeric entries within a block (non-recursive).
function sumEntries(block) {
  let sum = 0;
  block.children.forEach(child => {
    if (child.type === "entry" && typeof child.value === "number") {
      sum += child.value;
    }
  });
  return sum;
}

/* ============================
   Navigation & Views
============================ */

// Home view: Display cards for each main category (top-level block).
function showHome() {
  const content = document.getElementById("content");
  content.innerHTML = "<h2>Main Categories</h2>";
  let grid = document.createElement("div");
  grid.className = "card-grid";
  parsedData.forEach(block => {
    let card = document.createElement("div");
    card.className = "card";
    let title = document.createElement("h2");
    title.textContent = block.name;
    card.appendChild(title);
    // Show total if available in the header (e.g., "$1,777,457.00")
    let total = getTotalFromBlockTitle(block);
    if (total !== null) {
      let p = document.createElement("p");
      p.textContent = "Total: $" + total.toLocaleString();
      card.appendChild(p);
    }
    card.addEventListener("click", () => showDetail(block));
    grid.appendChild(card);
  });
  content.appendChild(grid);
}

// Drill-down view: Display details for a given category block.
function showDetail(block) {
  const content = document.getElementById("content");
  content.innerHTML = "";
  let headerDiv = document.createElement("div");
  headerDiv.className = "detail-header";
  let title = document.createElement("h2");
  title.textContent = block.name;
  headerDiv.appendChild(title);
  let backBtn = document.createElement("button");
  backBtn.textContent = "Back";
  backBtn.className = "back-btn";
  backBtn.addEventListener("click", showHome);
  headerDiv.appendChild(backBtn);
  content.appendChild(headerDiv);

  // Display a table of key–value entries.
  let table = document.createElement("table");
  let tbody = document.createElement("tbody");
  block.children.forEach(child => {
    if (child.type === "entry") {
      let tr = document.createElement("tr");
      let tdKey = document.createElement("td");
      tdKey.textContent = child.key;
      let tdVal = document.createElement("td");
      tdVal.textContent = (typeof child.value === "number")
        ? "$" + child.value.toLocaleString()
        : child.value;
      tr.appendChild(tdKey);
      tr.appendChild(tdVal);
      tbody.appendChild(tr);
    }
  });
  if (tbody.children.length > 0) {
    table.appendChild(tbody);
    content.appendChild(table);
  } else {
    let p = document.createElement("p");
    p.textContent = "No detailed entries available.";
    content.appendChild(p);
  }

  // If there is numeric data, create a couple of charts.
  let numericEntries = block.children.filter(child => child.type === "entry" && typeof child.value === "number");
  if (numericEntries.length > 0) {
    let chartGrid = document.createElement("div");
    chartGrid.className = "chart-grid";
    
    // Bar Chart
    let barDiv = document.createElement("div");
    barDiv.className = "chart-container";
    chartGrid.appendChild(barDiv);
    let barData = [{
      x: numericEntries.map(e => e.key),
      y: numericEntries.map(e => e.value),
      type: "bar"
    }];
    let barLayout = { title: "Bar Chart: " + block.name };
    Plotly.newPlot(barDiv, barData, barLayout);

    // Pie Chart
    let pieDiv = document.createElement("div");
    pieDiv.className = "chart-container";
    chartGrid.appendChild(pieDiv);
    let pieData = [{
      values: numericEntries.map(e => e.value),
      labels: numericEntries.map(e => e.key),
      type: "pie",
      textinfo: "label+percent"
    }];
    let pieLayout = { title: "Pie Chart: " + block.name };
    Plotly.newPlot(pieDiv, pieData, pieLayout);

    content.appendChild(chartGrid);
  }
}

// Executive Review view: Displays red flag narratives and supporting charts.
function showExecutiveReview() {
  const content = document.getElementById("content");
  content.innerHTML = "<h2>Executive Review: Red Flags & Questionable Allocations</h2>";
  let backBtn = document.createElement("button");
  backBtn.textContent = "Back";
  backBtn.className = "back-btn";
  backBtn.addEventListener("click", showHome);
  content.appendChild(backBtn);

  let reviewDiv = document.createElement("div");
  reviewDiv.className = "review-section";

  // 1. Extremely High Administrative Overhead
  let adminFlag = document.createElement("div");
  adminFlag.className = "red-flag";
  adminFlag.innerHTML = `<h4>1. Extremely High Administrative Overhead</h4>
    <p>Student Salaries + Stipends + Career Employee Salaries = Over $3.3M+</p>
    <p>This is approximately 37.4% of the total revenue of $8.83M.</p>`;
  reviewDiv.appendChild(adminFlag);
  // Compute overhead using blocks (if available)
  let careerBlock = getBlockByName(parsedData, "CAREER EMPLOYEES");
  let studentSalariesBlock = getBlockByName(parsedData, "STUDENT SALARIES SUMMARY");
  let studentStipendsBlock = getBlockByName(parsedData, "STUDENT STIPENDS");
  let careerTotal = careerBlock ? (getTotalFromBlockTitle(careerBlock) || sumEntries(careerBlock)) : 0;
  let studentSalariesTotal = studentSalariesBlock ? (getTotalFromBlockTitle(studentSalariesBlock) || sumEntries(studentSalariesBlock)) : 0;
  let studentStipendsTotal = studentStipendsBlock ? sumEntries(studentStipendsBlock) : 285000; // fallback value
  let adminOverhead = careerTotal + studentSalariesTotal + studentStipendsTotal;
  let revenueBlock = getBlockByName(parsedData, "BUDGET SUMMARY");
  let revenue = 8834339; // default revenue
  if (revenueBlock) {
    let revEntry = revenueBlock.children.find(e => e.type === "entry" && e.key.includes("AS Revenue"));
    if (revEntry && typeof revEntry.value === "number") {
      revenue = revEntry.value;
    }
  }
  let nonAdmin = revenue - adminOverhead;
  let adminChartDiv = document.createElement("div");
  adminChartDiv.className = "chart-container";
  reviewDiv.appendChild(adminChartDiv);
  let adminData = [{
    values: [adminOverhead, nonAdmin],
    labels: ["Admin Overhead", "Other Spending"],
    type: "pie",
    textinfo: "label+percent"
  }];
  let adminLayout = { title: "Administrative Overhead vs. Other Spending" };
  Plotly.newPlot(adminChartDiv, adminData, adminLayout);

  // 2. Bloated Management Structures
  let managementFlag = document.createElement("div");
  managementFlag.className = "red-flag";
  managementFlag.innerHTML = `<h4>2. Bloated Management Structures</h4>
    <p>Dozens of AVPs, Directors, Coordinators, etc. with high cost relative to small programming budgets.</p>`;
  reviewDiv.appendChild(managementFlag);
  let managementChartDiv = document.createElement("div");
  managementChartDiv.className = "chart-container";
  reviewDiv.appendChild(managementChartDiv);
  // Simulated data for demonstration
  let managementData = [{
    x: ["AVP", "Director", "Coordinator", "Chief of Staff"],
    y: [5, 10, 8, 6],
    type: "bar"
  }];
  let managementLayout = { title: "Management Roles Count (Simulated)" };
  Plotly.newPlot(managementChartDiv, managementData, managementLayout);

  // 3. Too Many “Micro-Stipends”
  let stipendsFlag = document.createElement("div");
  stipendsFlag.className = "red-flag";
  stipendsFlag.innerHTML = `<h4>3. Too Many “Micro-Stipends”</h4>
    <p>Multiple roles receiving $500–$1,500 annually.</p>`;
  reviewDiv.appendChild(stipendsFlag);
  let stipendsChartDiv = document.createElement("div");
  stipendsChartDiv.className = "chart-container";
  reviewDiv.appendChild(stipendsChartDiv);
  // Simulated data for micro-stipends
  let stipendsData = [{
    x: ["Role A", "Role B", "Role C", "Role D"],
    y: [3, 4, 2, 5],
    type: "bar"
  }];
  let stipendsLayout = { title: "Micro-Stipends Distribution (Simulated)" };
  Plotly.newPlot(stipendsChartDiv, stipendsData, stipendsLayout);

  // 4. Unclear or Vague Categories
  let vagueFlag = document.createElement("div");
  vagueFlag.className = "red-flag";
  vagueFlag.innerHTML = `<h4>4. Unclear or Vague Categories</h4>
    <p>Overuse of terms like “Projects and Initiatives”, “Marketing and Outreach”, etc.</p>`;
  reviewDiv.appendChild(vagueFlag);

  // 5. Event Spending vs. Program Spending Imbalance
  let eventFlag = document.createElement("div");
  eventFlag.className = "red-flag";
  eventFlag.innerHTML = `<h4>5. Event Spending vs. Program Spending Imbalance</h4>
    <p>Events receive roughly 10× more funding than basic needs or long-term support.</p>`;
  reviewDiv.appendChild(eventFlag);
  let eventChartDiv = document.createElement("div");
  eventChartDiv.className = "chart-container";
  reviewDiv.appendChild(eventChartDiv);
  // Simulated comparison data
  let eventData = [{
    x: ["Event Spending", "Program Spending"],
    y: [385000, 60000],
    type: "bar"
  }];
  let eventLayout = { title: "Event vs. Program Spending (Simulated)" };
  Plotly.newPlot(eventChartDiv, eventData, eventLayout);

  // 6. Redundant Roles with High Cost
  let redundantFlag = document.createElement("div");
  redundantFlag.className = "red-flag";
  redundantFlag.innerHTML = `<h4>6. Redundant Roles with High Cost</h4>
    <p>Multiple similar roles across the organization, inflating overhead.</p>`;
  reviewDiv.appendChild(redundantFlag);
  let redundantChartDiv = document.createElement("div");
  redundantChartDiv.className = "chart-container";
  reviewDiv.appendChild(redundantChartDiv);
  let redundantData = [{
    type: "treemap",
    labels: ["Graphic Artists", "Sr. Graphic Artists", "Chiefs of Staff", "Marketing Coordinators"],
    parents: ["", "", "", ""],
    values: [3, 2, 4, 5],
    textinfo: "label+value"
  }];
  let redundantLayout = { title: "Redundant Roles Breakdown (Simulated)" };
  Plotly.newPlot(redundantChartDiv, [redundantData], redundantLayout);

  // 7. Lack of Prioritization: High Overhead, Low Impact
  let prioritizationFlag = document.createElement("div");
  prioritizationFlag.className = "red-flag";
  prioritizationFlag.innerHTML = `<h4>7. Lack of Prioritization: High Overhead, Low Impact</h4>
    <p>Spending is heavily internal-facing with little emphasis on student services.</p>`;
  reviewDiv.appendChild(prioritizationFlag);

  // 8. No Budgeting by Outcomes
  let outcomesFlag = document.createElement("div");
  outcomesFlag.className = "red-flag";
  outcomesFlag.innerHTML = `<h4>8. No Budgeting by Outcomes</h4>
    <p>Flat figures with no apparent cost-benefit analysis or impact assessment.</p>`;
  reviewDiv.appendChild(outcomesFlag);

  // 9. Minimal Contingency Planning
  let contingencyFlag = document.createElement("div");
  contingencyFlag.className = "red-flag";
  contingencyFlag.innerHTML = `<h4>9. Minimal Contingency Planning</h4>
    <p>Only $20K listed for contingency with no clear emergency fund.</p>`;
  reviewDiv.appendChild(contingencyFlag);

  content.appendChild(reviewDiv);
}
