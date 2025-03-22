// Global variables to support drill-down filtering.
let drillDownStack = [];
let currentViewData = [];  // will hold an array of nodes for current level.
let currentTitle = "Spending";

// On page load, fetch data.txt from the repo and initialize charts.
document.addEventListener("DOMContentLoaded", function() {
  fetch("data.txt")
    .then(response => response.text())
    .then(text => {
      // Parse the top-level sections.
      const topData = parseData(text);
      topData.forEach(node => computeSums(node));
      // Set global current view.
      currentViewData = topData;
      currentTitle = "Spending";
      updateAllCharts(currentViewData, currentTitle);
    })
    .catch(err => console.error("Error loading data.txt:", err));

  // Set up Back button event.
  document.getElementById("backButton").addEventListener("click", () => {
    if (drillDownStack.length > 0) {
      const previous = drillDownStack.pop();
      currentViewData = previous.data;
      currentTitle = previous.title;
      updateAllCharts(currentViewData, currentTitle);
      if (drillDownStack.length === 0) {
        document.getElementById("backButton").style.display = "none";
      }
    }
  });
});

// updateAllCharts takes an array of nodes and a title, wraps the data,
// and renders the three visualizations.
function updateAllCharts(data, title) {
  // Wrap current data into an object for the treemap.
  const wrappedData = { name: title, children: data };
  document.getElementById("treemapTitle").innerText = `${title} Treemap`;
  document.getElementById("barChartTitle").innerText = `${title} Breakdown (Bar Chart)`;
  document.getElementById("pieChartTitle").innerText = `${title} Breakdown (Pie Chart)`;
  
  createTreemap(wrappedData);
  createBarChart(data);
  createPieChart(data);
}

// DRILL-DOWN: Given a node, if it has children or line items, drill down to show its breakdown.
function drillDown(node) {
  // Determine if there is any breakdown (either nested children or items).
  if ((!node.children || node.children.length === 0) && (!node.items || node.items.length === 0)) {
    return; // nothing to drill down.
  }
  // Build a combined array from the node's children and items.
  let subnodes = [];
  if (node.children && node.children.length > 0) {
    subnodes = subnodes.concat(node.children);
  }
  if (node.items && node.items.length > 0) {
    // Convert each line item into a node.
    const itemNodes = node.items.map(item => ({
      name: item.key,
      value: item.amount,
      children: [],
      items: []
    }));
    subnodes = subnodes.concat(itemNodes);
  }
  // Push current view onto the drillDownStack.
  drillDownStack.push({ data: currentViewData, title: currentTitle });
  // Update globals.
  currentViewData = subnodes;
  currentTitle = node.name;
  // Show the back button.
  document.getElementById("backButton").style.display = "inline-block";
  updateAllCharts(currentViewData, currentTitle);
}

// ----------------------
// PARSING FUNCTIONS
// ----------------------

// Parses data.txt into a nested JSON structure.
function parseData(text) {
  const lines = text.split("\n");
  let index = 0;
  const sections = [];

  while (index < lines.length) {
    let line = lines[index].trim();
    if (line === "") { 
      index++; 
      continue; 
    }
    if (line.startsWith("[")) {
      sections.push(parseSection());
    } else {
      index++;
    }
  }
  return sections;

  // Recursively parse a section.
  function parseSection() {
    const section = { name: "", amount: 0, items: [], children: [] };
    const headerLine = lines[index++].trim();
    const headerRegex = /^\[+\s*([^:\]]+)(?::\s*\$([\d,.\-]+))?\s*\]+.*\{/;
    const headerMatch = headerLine.match(headerRegex);
    if (headerMatch) {
      section.name = headerMatch[1].trim();
      if (headerMatch[2]) {
        section.amount = parseFloat(headerMatch[2].replace(/,/g, ""));
      }
    }
    while (index < lines.length) {
      let currLine = lines[index].trim();
      if (currLine === "}" || currLine === "};") {
        index++;
        break;
      }
      if (currLine.startsWith("[")) {
        section.children.push(parseSection());
      } else if (currLine !== "") {
        const item = parseItem(currLine);
        if (item) section.items.push(item);
        index++;
      } else {
        index++;
      }
    }
    return section;
  }
}

// Parse a line item, e.g. "Total Reserves | $1,189,555.55"
function parseItem(line) {
  const itemRegex = /^(.+?)[|\–-]\s*\(?\$([\d,.\-]+)\)?/;
  const match = line.match(itemRegex);
  if (match) {
    const key = match[1].trim();
    const rawValue = match[2].replace(/,/g, "");
    const value = parseFloat(rawValue);
    return { key: key, amount: value };
  }
  return null;
}

// Recursively compute the sum of amounts for a node.
function computeSums(node) {
  let sumItems = node.items.reduce((acc, item) => acc + item.amount, 0);
  let sumChildren = node.children.reduce((acc, child) => acc + computeSums(child), 0);
  node.value = (node.amount || 0) + sumItems + sumChildren;
  return node.value;
}

// ----------------------
// VISUALIZATION FUNCTIONS
// ----------------------

// TREEMAP
function createTreemap(rootData) {
  d3.select("#treemap").select("svg").remove();
  const width = 1000, height = 600;
  const svg = d3.select("#treemap")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
  
  const root = d3.hierarchy(rootData)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);
  
  d3.treemap()
    .size([width, height])
    .padding(4)(root);
  
  const nodes = svg.selectAll("g")
    .data(root.leaves())
    .enter()
    .append("g")
    .attr("transform", d => `translate(${d.x0},${d.y0})`)
    .on("click", (event, d) => drillDown(d.data));
  
  nodes.append("rect")
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => d.y1 - d.y0)
    .attr("fill", d => d3.interpolateBlues(d.data.value / root.data.value))
    .on("mousemove", (event, d) => {
      tooltip.style("opacity", 1)
        .html(`<strong>${d.data.name}</strong><br>$${d.data.value.toLocaleString()}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 25) + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));
  
  nodes.append("text")
    .attr("x", 4)
    .attr("y", 14)
    .text(d => d.data.name)
    .attr("font-size", "12px")
    .attr("fill", "white")
    .call(wrapText, (d) => d.x1 - d.x0 - 4);
}

// BAR CHART: Displays one bar for each node in the current view.
function createBarChart(data) {
  d3.select("#barChart").select("svg").remove();
  const margin = { top: 40, right: 20, bottom: 100, left: 120 },
        width = 1000 - margin.left - margin.right,
        height = 600 - margin.top - margin.bottom;
  
  // Prepare barData from the current view.
  const barData = data.map(d => ({ name: d.name, value: d.value, data: d }));
  
  const svg = d3.select("#barChart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  const x = d3.scaleBand()
    .domain(barData.map(d => d.name))
    .range([0, width])
    .padding(0.4);
  
  const y = d3.scaleLinear()
    .domain([0, d3.max(barData, d => d.value)]).nice()
    .range([height, 0]);
  
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "12px");
  
  svg.append("g")
    .call(d3.axisLeft(y).tickFormat(d => "$" + d3.format(",")(d)))
    .style("font-size", "12px");
  
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
  
  svg.selectAll(".bar")
    .data(barData)
    .enter()
    .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.name))
      .attr("y", d => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.value))
      .attr("fill", "#69b3a2")
      .on("mousemove", (event, d) => {
        tooltip.style("opacity", 1)
          .html(`<strong>${d.name}</strong><br>$${d.value.toLocaleString()}`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 25) + "px");
      })
      .on("mouseout", () => tooltip.style("opacity", 0))
      .on("click", (event, d) => drillDown(d.data));
}

// PIE CHART: Shows the percentage breakdown for the current view.
function createPieChart(data) {
  d3.select("#pieChart").select("svg").remove();
  const width = 500, height = 500, margin = 40;
  const radius = Math.min(width, height) / 2 - margin;
  
  // Build pieData from the current view.
  const pieData = {};
  data.forEach(d => { pieData[d.name] = d.value; });
  
  const svg = d3.select("#pieChart")
    .append("svg")
      .attr("width", width)
      .attr("height", height)
    .append("g")
      .attr("transform", `translate(${width/2},${height/2})`);
  
  const color = d3.scaleOrdinal()
    .domain(Object.keys(pieData))
    .range(d3.schemeSet2);
  
  const pie = d3.pie()
    .value(d => d.value);
  const data_ready = pie(d3.entries(pieData));
  
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
  
  svg.selectAll('path')
    .data(data_ready)
    .enter()
    .append('path')
    .attr('d', d3.arc()
      .innerRadius(0)
      .outerRadius(radius)
    )
    .attr('fill', d => color(d.data.key))
    .attr("stroke", "white")
    .style("stroke-width", "2px")
    .on("mousemove", (event, d) => {
      const total = d3.sum(Object.values(pieData));
      const percent = ((d.data.value / total)*100).toFixed(2);
      tooltip.style("opacity", 1)
        .html(`<strong>${d.data.key}</strong><br>$${d.data.value.toLocaleString()}<br>${percent}%`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 25) + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0))
    .on("click", (event, d) => {
      // Find the corresponding node in currentViewData and drill down if possible.
      const node = currentViewData.find(n => n.name === d.data.key);
      if (node) drillDown(node);
    });
}

// Utility: Wrap text in SVG text elements if too long.
function wrapText(textSelection, maxWidthFn) {
  textSelection.each(function(d) {
    const text = d3.select(this),
          words = text.text().split(/\s+/).reverse(),
          maxWidth = maxWidthFn(d);
    let word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = text.attr("y"),
        dy = 0, // baseline offset
        tspan = text.text(null).append("tspan").attr("x", 4).attr("y", y).attr("dy", dy + "em");
    
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > maxWidth && line.length > 1) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 4).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
      }
    }
  });
}
