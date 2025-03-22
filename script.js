// When the document loads, fetch the data file, parse it, extract student spending, and render charts.
document.addEventListener("DOMContentLoaded", function () {
    fetch("data.txt")
      .then((response) => response.text())
      .then((dataText) => {
        const parsedData = parseData(dataText);
        const spendingData = getStudentSpendingData(parsedData);
        if (spendingData.length === 0) {
          console.error("No student spending data found!");
          return;
        }
        // Create the different visualizations
        createStackedBarChart(spendingData);
        createMekkoChart(spendingData);
        createPieChart(spendingData);
        createBubbleChart(spendingData);
        createWaterfallChart(spendingData);
        createHeatMap(spendingData);
        createTreemapChart(spendingData);
        createSankeyChart(spendingData);
      })
      .catch((error) => console.error("Error loading data:", error));
  });
  
  /* ===========================
     Data Parsing Functions
     ===========================
     This parser handles your custom file format:
     - A block begins with a header like "[SECTION NAME] {"
     - Key-value pairs use either "|" or "–" as a separator.
     - Blocks may nest.
  */
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
    let s = valueStr.trim();
    s = s.replace(/,/g, "");
    let negative = false;
    if (s.startsWith("(") && s.endsWith(")")) {
      negative = true;
      s = s.slice(1, -1);
    }
    s = s.replace("$", "");
    let num = parseFloat(s);
    if (!isNaN(num)) {
      return negative ? -num : num;
    }
    return valueStr;
  }
  
  /* ===========================
     Extract Student Spending Data
     ===========================
     We look for a block whose name includes "STUDENT SALARIES SUMMARY"
     and then combine its nested key-value entries.
  */
  function getStudentSpendingData(blocks) {
    let studentBlock = null;
    for (let block of blocks) {
      if (block.name && block.name.includes("STUDENT SALARIES SUMMARY")) {
        studentBlock = block;
        break;
      }
    }
    if (!studentBlock) return [];
    let entries = [];
    studentBlock.children.forEach((child) => {
      if (child.type === "block") {
        child.children.forEach((grandchild) => {
          if (grandchild.type === "entry") {
            entries.push(grandchild);
          }
        });
      } else if (child.type === "entry") {
        entries.push(child);
      }
    });
    return entries;
  }
  
  /* ===========================
     Chart Creation Functions
     ===========================
     Each function uses Plotly to render a different chart type
     based on the extracted student spending data.
  */
  
  // 1. Stacked Bar Chart – one bar with segments for each spending item
  function createStackedBarChart(data) {
    let categories = ["Student Salaries"];
    let traces = data.map((entry) => {
      return {
        x: categories,
        y: [entry.value],
        name: entry.key,
        type: "bar",
      };
    });
    let layout = {
      barmode: "stack",
      title: "Stacked Bar Chart: Student Salaries Breakdown",
    };
    Plotly.newPlot("stackedBarChart", traces, layout);
  }
  
  // 2. Mekko Chart – simulated using a treemap layout
  function createMekkoChart(data) {
    let labels = data.map((entry) => entry.key);
    let values = data.map((entry) => entry.value);
    let trace = {
      type: "treemap",
      labels: labels,
      values: values,
      textinfo: "label+value",
    };
    let layout = {
      title: "Mekko Chart (Simulated with Treemap)",
    };
    Plotly.newPlot("mekkoChart", [trace], layout);
  }
  
  // 3. Pie Chart – showing spending proportions
  function createPieChart(data) {
    let labels = data.map((entry) => entry.key);
    let values = data.map((entry) => entry.value);
    let trace = {
      type: "pie",
      labels: labels,
      values: values,
      textinfo: "label+percent",
    };
    let layout = {
      title: "Pie Chart: Student Spending Distribution",
    };
    Plotly.newPlot("pieChart", [trace], layout);
  }
  
  // 4. Bubble Chart – each item as a bubble with size proportional to spending
  function createBubbleChart(data) {
    let x = data.map((_, i) => i + 1);
    let y = data.map((entry) => entry.value);
    let text = data.map((entry) => entry.key);
    let trace = {
      x: x,
      y: y,
      text: text,
      mode: "markers",
      marker: {
        size: y.map((v) => Math.sqrt(Math.abs(v)) * 2),
        sizemode: "area",
      },
      type: "scatter",
    };
    let layout = {
      title: "Bubble Chart: Student Spending",
      xaxis: { title: "Item Index" },
      yaxis: { title: "Spending Amount" },
    };
    Plotly.newPlot("bubbleChart", [trace], layout);
  }
  
  // 5. Waterfall Chart – showing the relative change for each spending item
  function createWaterfallChart(data) {
    let measure = data.map(() => "relative");
    let x = data.map((entry) => entry.key);
    let y = data.map((entry) => entry.value);
    let trace = {
      type: "waterfall",
      measure: measure,
      x: x,
      y: y,
      text: y.map((val) => "$" + val.toFixed(2)),
      connector: { line: { color: "rgb(63, 63, 63)" } },
    };
    let layout = {
      title: "Waterfall Chart: Student Spending Changes",
    };
    Plotly.newPlot("waterfallChart", [trace], layout);
  }
  
  // 6. Heat Map – arrange spending amounts in a grid layout
  function createHeatMap(data) {
    const columns = 4;
    const rows = Math.ceil(data.length / columns);
    let z = [];
    let text = [];
    for (let r = 0; r < rows; r++) {
      let rowValues = [];
      let rowText = [];
      for (let c = 0; c < columns; c++) {
        const idx = r * columns + c;
        if (idx < data.length) {
          rowValues.push(data[idx].value);
          rowText.push(data[idx].key);
        } else {
          rowValues.push(null);
          rowText.push("");
        }
      }
      z.push(rowValues);
      text.push(rowText);
    }
    let trace = {
      z: z,
      x: Array.from({ length: columns }, (_, i) => `Col ${i + 1}`),
      y: Array.from({ length: rows }, (_, i) => `Row ${i + 1}`),
      type: "heatmap",
      text: text,
      hovertemplate: "Value: %{z}<br>Item: %{text}<extra></extra>",
    };
    let layout = {
      title: "Heat Map: Student Spending Grid",
    };
    Plotly.newPlot("heatMap", [trace], layout);
  }
  
  // 7. Treemap Chart – hierarchical breakdown with a single root
  function createTreemapChart(data) {
    let labels = data.map((entry) => entry.key);
    let values = data.map((entry) => entry.value);
    let trace = {
      type: "treemap",
      labels: labels,
      parents: Array(labels.length).fill("Student Spending"),
      values: values,
      textinfo: "label+value",
    };
    let layout = {
      title: "Treemap: Student Spending Breakdown",
    };
    Plotly.newPlot("treemapChart", [trace], layout);
  }
  
  // 8. Sankey Diagram – flow from a single source to each spending item
  function createSankeyChart(data) {
    let source = [];
    let target = [];
    let value = [];
    let labels = ["Student Spending"].concat(data.map((entry) => entry.key));
    data.forEach((entry, i) => {
      source.push(0);
      target.push(i + 1);
      value.push(entry.value);
    });
    let trace = {
      type: "sankey",
      orientation: "h",
      node: {
        pad: 15,
        thickness: 20,
        line: { color: "black", width: 0.5 },
        label: labels,
        color: "blue",
      },
      link: {
        source: source,
        target: target,
        value: value,
        color: "rgba(0,100,200,0.5)",
      },
    };
    let layout = {
      title: "Sankey Diagram: Flow of Student Spending",
      font: { size: 10 },
    };
    Plotly.newPlot("sankeyChart", [trace], layout);
  }
  