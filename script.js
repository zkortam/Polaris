// On page load, automatically fetch data.txt from the repository.
document.addEventListener("DOMContentLoaded", function() {
    fetch("data.txt")
      .then(response => response.text())
      .then(text => {
        const dataTree = parseData(text);
        // Recursively compute sums for each section
        dataTree.forEach(node => computeSums(node));
        // Draw interactive visualizations
        createTreemap({ name: "Spending", children: dataTree });
        createBarChart(dataTree);
        createPieChart(dataTree);
      })
      .catch(err => console.error("Error loading data.txt:", err));
  });
  
  // ----------------------
  // PARSING FUNCTIONS
  // ----------------------
  
  // Parses the provided text (data.txt) into a nested JSON structure.
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
  
    // Recursive function to parse a section (handles nested sections)
    function parseSection() {
      const section = { name: "", amount: 0, items: [], children: [] };
  
      // Example header: [OPERATING RESERVES] {  or [[Subsection: $123,456.78]] {
      const headerLine = lines[index++].trim();
      const headerRegex = /^\[+\s*([^:\]]+)(?::\s*\$([\d,.\-]+))?\s*\]+.*\{/;
      const headerMatch = headerLine.match(headerRegex);
      if (headerMatch) {
        section.name = headerMatch[1].trim();
        if (headerMatch[2]) {
          section.amount = parseFloat(headerMatch[2].replace(/,/g, ""));
        }
      }
      // Process lines until the closing "}" is encountered
      while (index < lines.length) {
        let currLine = lines[index].trim();
        if (currLine === "}" || currLine === "};") {
          index++;
          break;
        }
        // If a new section starts inside, parse it recursively
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
  
  // Parses a line item such as:
  // "Total Reserves | $1,189,555.55" or "Student Life Development Specialist IV (1 FTE)* – ($123,948.00)"
  function parseItem(line) {
    // This regex searches for a key, a separator (|, –, or -) and a dollar amount (possibly wrapped in parentheses)
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
  
  // Recursively computes the sum of amounts for a node (its own amount, line items, and nested children).
  function computeSums(node) {
    let sumItems = node.items.reduce((acc, item) => acc + item.amount, 0);
    let sumChildren = node.children.reduce((acc, child) => acc + computeSums(child), 0);
    node.value = (node.amount || 0) + sumItems + sumChildren;
    return node.value;
  }
  
  // ----------------------
  // VISUALIZATION FUNCTIONS
  // ----------------------
  
  // TREEMAP visualization of the hierarchical spending data.
  function createTreemap(rootData) {
    // Clear previous chart if exists
    d3.select("#treemap").select("svg").remove();
  
    const width = 800;
    const height = 400;
  
    const svg = d3.select("#treemap")
      .append("svg")
      .attr("width", width)
      .attr("height", height);
  
    // Create a tooltip for interactive hover
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
  
    const root = d3.hierarchy(rootData)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);
  
    d3.treemap()
      .size([width, height])
      .padding(2)(root);
  
    const nodes = svg.selectAll("g")
      .data(root.leaves())
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);
  
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
      .attr("font-size", "10px")
      .attr("fill", "white");
  }
  
  // BAR CHART comparing top-level section spending
  function createBarChart(data) {
    // Clear previous chart if exists
    d3.select("#barChart").select("svg").remove();
  
    const margin = { top: 30, right: 20, bottom: 50, left: 80 },
          width = 800 - margin.left - margin.right,
          height = 400 - margin.top - margin.bottom;
  
    // Prepare data: one bar for each top-level section
    const barData = data.map(d => ({ name: d.name, value: d.value }));
  
    const svg = d3.select("#barChart")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    const x = d3.scaleBand()
      .domain(barData.map(d => d.name))
      .range([0, width])
      .padding(0.3);
  
    const y = d3.scaleLinear()
      .domain([0, d3.max(barData, d => d.value)]).nice()
      .range([height, 0]);
  
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end");
  
    svg.append("g")
      .call(d3.axisLeft(y).tickFormat(d => "$" + d3.format(",")(d)));
  
    // Tooltip for the bar chart
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
        .on("mouseout", () => tooltip.style("opacity", 0));
  }
  
  // PIE CHART showing the percentage breakdown of top-level spending
  function createPieChart(data) {
    // Clear previous chart if exists
    d3.select("#pieChart").select("svg").remove();
  
    const width = 450,
          height = 450,
          margin = 40;
  
    const radius = Math.min(width, height) / 2 - margin;
  
    // Prepare pie data from top-level sections
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
  
    // Tooltip for pie chart
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
  
    svg.selectAll('whatever')
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
        const percent = ((d.data.value / d3.sum(Object.values(pieData)))*100).toFixed(2);
        tooltip.style("opacity", 1)
          .html(`<strong>${d.data.key}</strong><br>$${d.data.value.toLocaleString()}<br>${percent}%`)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 25) + "px");
      })
      .on("mouseout", () => tooltip.style("opacity", 0));
  }
  