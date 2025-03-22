// Helper functions
export function sumGroup(node) {
    let sum = 0;
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        sum += sumGroup(child);
      });
    } else if ((node.level === "D" || node.level === "E") && typeof node.value === "number") {
      sum += Math.abs(node.value);
    }
    return sum;
  }
  
  export function getCategoryColor(name) {
    let upper = name.toUpperCase();
    if (upper.includes("STUDENT") || upper.includes("EVENT")) {
      return "#66CC66"; // green for student/service-related
    }
    return "#FF6666"; // red for operational
  }
  
  // Original Visualizations
  
  export function createSankeyDiagram(budgetGroup) {
    let items = [];
    if (budgetGroup.children && budgetGroup.children.length > 0) {
      let bGroup = budgetGroup.children.find(child => child.level === "B");
      if (bGroup && bGroup.children) {
        let cGroup = bGroup.children.find(child => child.level === "C");
        if (cGroup && cGroup.children) {
          items = cGroup.children.filter(child => child.level === "D" && child.value !== undefined);
        }
      }
    }
    let revenueItem = items.find(item => item.name.toUpperCase().includes("AS REVENUE"));
    if (!revenueItem) return;
    let spendingItems = items.filter(item => item !== revenueItem && typeof item.value === "number" && item.value < 0);
    let sources = [];
    let targets = [];
    let values = [];
    let labels = ["AS Revenue"];
    spendingItems.forEach(item => {
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
  
  export function createCategoryTreemap(aGroups) {
    let labels = [];
    let parents = [];
    let values = [];
    let colors = [];
    aGroups.forEach(node => {
      labels.push(node.name);
      parents.push("Total Spending");
      let sum = sumGroup(node);
      values.push(sum);
      colors.push(getCategoryColor(node.name));
    });
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
  
  export function createDeficitGauge(budgetGroup) {
    let items = [];
    if (budgetGroup.children && budgetGroup.children.length > 0) {
      let bGroup = budgetGroup.children.find(child => child.level === "B");
      if (bGroup && bGroup.children) {
        let cGroup = bGroup.children.find(child => child.level === "C");
        if (cGroup && cGroup.children) {
          items = cGroup.children.filter(child => child.level === "D" && child.value !== undefined);
        }
      }
    }
    let deficitItem = items.find(item => item.name.toUpperCase().includes("REMAINING FUNDS"));
    let deficit = deficitItem ? deficitItem.value : -587367.41;
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
  
  export function createStackedBarChart(budgetGroup) {
    let items = [];
    if (budgetGroup.children && budgetGroup.children.length > 0) {
      let bGroup = budgetGroup.children.find(child => child.level === "B");
      if (bGroup && bGroup.children) {
        let cGroup = bGroup.children.find(child => child.level === "C");
        if (cGroup && cGroup.children) {
          items = cGroup.children.filter(child => child.level === "D" && child.value !== undefined);
        }
      }
    }
    let revenueItem = items.find(item => item.name.toUpperCase().includes("AS REVENUE"));
    let spendingItems = items.filter(item => item !== revenueItem && typeof item.value === "number");
    let labels = spendingItems.map(item => item.name);
    let values = spendingItems.map(item => Math.abs(item.value));
    let trace = {
      x: labels,
      y: values,
      type: "bar",
      marker: { color: "rgba(100,149,237,0.8)" }
    };
    let data = [trace];
    let layout = {
      title: "Stacked Bar Chart: Spending Breakdown",
      barmode: "stack",
      xaxis: { tickangle: -45 }
    };
    Plotly.newPlot("stackedBarChart", data, layout);
  }
  
  export function createPieChart(budgetGroup) {
    let items = [];
    if (budgetGroup.children && budgetGroup.children.length > 0) {
      let bGroup = budgetGroup.children.find(child => child.level === "B");
      if (bGroup && bGroup.children) {
        let cGroup = bGroup.children.find(child => child.level === "C");
        if (cGroup && cGroup.children) {
          items = cGroup.children.filter(child => child.level === "D" && child.value !== undefined);
        }
      }
    }
    let revenueItem = items.find(item => item.name.toUpperCase().includes("AS REVENUE"));
    let spendingItems = items.filter(item => item !== revenueItem && typeof item.value === "number");
    let labels = spendingItems.map(item => item.name);
    let values = spendingItems.map(item => Math.abs(item.value));
    let data = [{
      values: values,
      labels: labels,
      type: "pie",
      textinfo: "label+percent",
      hole: 0.3
    }];
    let layout = { title: "Pie Chart: Spending Distribution" };
    Plotly.newPlot("pieChart", data, layout);
  }
  
  export function createBubbleChart(budgetGroup) {
    let items = [];
    if (budgetGroup.children && budgetGroup.children.length > 0) {
      let bGroup = budgetGroup.children.find(child => child.level === "B");
      if (bGroup && bGroup.children) {
        let cGroup = bGroup.children.find(child => child.level === "C");
        if (cGroup && cGroup.children) {
          items = cGroup.children.filter(child => child.level === "D" && child.value !== undefined);
        }
      }
    }
    let revenueItem = items.find(item => item.name.toUpperCase().includes("AS REVENUE"));
    let spendingItems = items.filter(item => item !== revenueItem && typeof item.value === "number");
    let x = spendingItems.map((item, i) => i + 1);
    let y = spendingItems.map(item => Math.abs(item.value));
    let text = spendingItems.map(item => item.name);
    let data = [{
      x: x,
      y: y,
      text: text,
      mode: "markers",
      marker: {
        size: y.map(val => Math.sqrt(val) * 2),
        sizemode: "area",
        color: y,
        colorscale: "Viridis"
      },
      type: "scatter"
    }];
    let layout = {
      title: "Bubble Chart: Spending Items",
      xaxis: { title: "Item Index" },
      yaxis: { title: "Spending Amount" }
    };
    Plotly.newPlot("bubbleChart", data, layout);
  }
  
  export function createWaterfallChart(budgetGroup) {
    let items = [];
    if (budgetGroup.children && budgetGroup.children.length > 0) {
      let bGroup = budgetGroup.children.find(child => child.level === "B");
      if (bGroup && bGroup.children) {
        let cGroup = bGroup.children.find(child => child.level === "C");
        if (cGroup && cGroup.children) {
          items = cGroup.children.filter(child => child.level === "D" && child.value !== undefined);
        }
      }
    }
    let revenueItem = items.find(item => item.name.toUpperCase().includes("AS REVENUE"));
    if (!revenueItem) return;
    let spendingItems = items.filter(item => item !== revenueItem && typeof item.value === "number" && item.value < 0);
    let measures = spendingItems.map(() => "relative");
    let x = spendingItems.map(item => item.name);
    let y = spendingItems.map(item => Math.abs(item.value));
    let data = [{
      type: "waterfall",
      measure: measures,
      x: x,
      y: y,
      text: y.map(val => "$" + val.toFixed(2)),
      connector: { line: { color: "rgb(63, 63, 63)" } }
    }];
    let layout = { title: "Waterfall Chart: Spending Changes" };
    Plotly.newPlot("waterfallChart", data, layout);
  }
  
  export function createHeatmapChart(budgetGroup) {
    let items = [];
    if (budgetGroup.children && budgetGroup.children.length > 0) {
      let bGroup = budgetGroup.children.find(child => child.level === "B");
      if (bGroup && bGroup.children) {
        let cGroup = bGroup.children.find(child => child.level === "C");
        if (cGroup && cGroup.children) {
          items = cGroup.children.filter(child => child.level === "D" && child.value !== undefined);
        }
      }
    }
    const columns = 4;
    const rows = Math.ceil(items.length / columns);
    let z = [];
    let text = [];
    for (let r = 0; r < rows; r++) {
      let rowVals = [];
      let rowTexts = [];
      for (let c = 0; c < columns; c++) {
        let idx = r * columns + c;
        if (idx < items.length) {
          rowVals.push(Math.abs(items[idx].value));
          rowTexts.push(items[idx].name);
        } else {
          rowVals.push(null);
          rowTexts.push("");
        }
      }
      z.push(rowVals);
      text.push(rowTexts);
    }
    let data = [{
      z: z,
      type: "heatmap",
      text: text,
      hovertemplate: "Value: %{z}<br>Item: %{text}<extra></extra>"
    }];
    let layout = {
      title: "Heatmap: Spending Items Grid"
    };
    Plotly.newPlot("heatmapChart", data, layout);
  }
  
  // Additional Visualizations
  
  // Donut Chart – a pie chart with a larger hole
  export function createDonutChart(budgetGroup) {
    let items = [];
    if (budgetGroup.children && budgetGroup.children.length > 0) {
      let bGroup = budgetGroup.children.find(child => child.level === "B");
      if (bGroup && bGroup.children) {
        let cGroup = bGroup.children.find(child => child.level === "C");
        if (cGroup && cGroup.children) {
          items = cGroup.children.filter(child => child.level === "D" && child.value !== undefined);
        }
      }
    }
    let revenueItem = items.find(item => item.name.toUpperCase().includes("AS REVENUE"));
    let spendingItems = items.filter(item => item !== revenueItem && typeof item.value === "number");
    let labels = spendingItems.map(item => item.name);
    let values = spendingItems.map(item => Math.abs(item.value));
    let data = [{
      values: values,
      labels: labels,
      type: "pie",
      hole: 0.6,
      textinfo: "label+percent"
    }];
    let layout = { title: "Donut Chart: Spending Distribution" };
    Plotly.newPlot("donutChart", data, layout);
  }
  
  // Line Chart – plots spending amounts sequentially
  export function createLineChart(budgetGroup) {
    let items = [];
    if (budgetGroup.children && budgetGroup.children.length > 0) {
      let bGroup = budgetGroup.children.find(child => child.level === "B");
      if (bGroup && bGroup.children) {
        let cGroup = bGroup.children.find(child => child.level === "C");
        if (cGroup && cGroup.children) {
          items = cGroup.children.filter(child => child.level === "D" && child.value !== undefined);
        }
      }
    }
    let revenueItem = items.find(item => item.name.toUpperCase().includes("AS REVENUE"));
    let spendingItems = items.filter(item => item !== revenueItem && typeof item.value === "number");
    let x = spendingItems.map((item, i) => i + 1);
    let y = spendingItems.map(item => Math.abs(item.value));
    let data = [{
      x: x,
      y: y,
      type: "scatter",
      mode: "lines+markers",
      marker: { size: 8 },
      line: { shape: "linear" }
    }];
    let layout = {
      title: "Line Chart: Spending Sequence",
      xaxis: { title: "Item Index" },
      yaxis: { title: "Spending Amount" }
    };
    Plotly.newPlot("lineChart", data, layout);
  }
  