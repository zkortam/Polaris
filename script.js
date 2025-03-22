document.addEventListener('DOMContentLoaded', function () {
    // Load the data file from the repo
    fetch('data.txt')
      .then((response) => response.text())
      .then((dataText) => {
        const parsedData = parseData(dataText);
        const sidebar = document.getElementById('sidebar');
        const ul = document.createElement('ul');
        parsedData.forEach((node) => {
          ul.appendChild(createTree(node));
        });
        sidebar.appendChild(ul);
      });
  });
  
  // --- PARSING CODE ---
  
  /*
    The parser reads the custom format:
    - Blocks start with a header like "[SECTION NAME] {"
    - Blocks end with a closing "}"
    - Inside blocks, lines with a "|" or "–" are treated as key-value pairs.
    - Nested blocks (using double square brackets, etc.) are handled recursively.
  */
  
  function parseData(dataText) {
    const lines = dataText.split('\n');
    let blocks = [];
    let index = 0;
    while (index < lines.length) {
      let line = lines[index].trim();
      if (line === "") {
        index++;
        continue;
      }
      // Look for a block header, e.g., "[OPERATING RESERVES] {"
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
    let block = { type: 'block', name: '', children: [] };
    while (index < lines.length) {
      let line = lines[index].trim();
      if (line === "") {
        index++;
        continue;
      }
      // End of this block
      if (line === "}") {
        return [block, index + 1];
      }
      // Check if the line starts a nested block (e.g., "[[Nested Name]] {")
      let blockHeaderMatch = line.match(/^\[+(.+?)\]+\s*\{$/);
      if (blockHeaderMatch) {
        let blockName = blockHeaderMatch[1].trim();
        let [childBlock, nextIndex] = parseBlock(lines, index + 1);
        childBlock.name = blockName;
        block.children.push(childBlock);
        index = nextIndex;
        continue;
      }
      // Parse key-value pairs using either "|" or "–" as a separator.
      let kvMatch = line.match(/^(.*?)\s*(\||–)\s*(.*?)$/);
      if (kvMatch) {
        let key = kvMatch[1].trim();
        let rawValue = kvMatch[3].trim();
        let value = parseValue(rawValue);
        block.children.push({ type: 'entry', key: key, value: value });
      } else {
        // If the line doesn't match, save as a text entry.
        block.children.push({ type: 'text', content: line });
      }
      index++;
    }
    return [block, index];
  }
  
  function parseValue(valueStr) {
    let s = valueStr.trim();
    // Remove commas from numbers
    s = s.replace(/,/g, '');
    let negative = false;
    // Treat values in parentheses as negative numbers
    if (s.startsWith('(') && s.endsWith(')')) {
      negative = true;
      s = s.slice(1, -1);
    }
    // Remove the dollar sign if present
    s = s.replace('$', '');
    let num = parseFloat(s);
    if (!isNaN(num)) {
      return negative ? -num : num;
    }
    return valueStr;
  }
  
  // --- TREE VIEW AND INTERACTIVITY ---
  
  function createTree(node) {
    let li = document.createElement('li');
    let span = document.createElement('span');
    span.textContent = node.name ? node.name : (node.key ? node.key : node.content);
    li.appendChild(span);
    if (node.type === 'block' && node.children && node.children.length > 0) {
      let ul = document.createElement('ul');
      node.children.forEach((child) => {
        ul.appendChild(createTree(child));
      });
      li.appendChild(ul);
      // Clicking the span toggles the collapse and shows details.
      span.addEventListener('click', function (e) {
        e.stopPropagation();
        ul.classList.toggle('collapsed');
        displayNodeDetails(node);
      });
    } else {
      span.addEventListener('click', function (e) {
        e.stopPropagation();
        displayNodeDetails(node);
      });
    }
    return li;
  }
  
  function displayNodeDetails(node) {
    const main = document.getElementById('main');
    main.innerHTML = '';
    const header = document.createElement('h2');
    header.textContent = node.name ? node.name : (node.key ? node.key : "Details");
    main.appendChild(header);
  
    if (node.type === 'block' && node.children) {
      // Create a table to list all key-value entries.
      const table = document.createElement('table');
      const tbody = document.createElement('tbody');
      node.children.forEach((child) => {
        if (child.type === 'entry') {
          const tr = document.createElement('tr');
          const tdKey = document.createElement('td');
          tdKey.textContent = child.key;
          const tdValue = document.createElement('td');
          tdValue.textContent = child.value;
          tr.appendChild(tdKey);
          tr.appendChild(tdValue);
          tbody.appendChild(tr);
        }
      });
      if (tbody.children.length > 0) {
        table.appendChild(tbody);
        main.appendChild(table);
      }
  
      // Prepare data for a bar chart if there are numeric values.
      let labels = [];
      let values = [];
      node.children.forEach((child) => {
        if (child.type === 'entry' && typeof child.value === 'number') {
          labels.push(child.key);
          values.push(child.value);
        }
      });
      if (values.length > 0) {
        const canvas = document.createElement('canvas');
        canvas.id = 'chartCanvas';
        main.appendChild(canvas);
        new Chart(canvas.getContext('2d'), {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Amount',
              data: values
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false
          }
        });
      }
    } else if (node.type === 'entry') {
      const p = document.createElement('p');
      p.textContent = `${node.key}: ${node.value}`;
      main.appendChild(p);
    } else if (node.type === 'text') {
      const p = document.createElement('p');
      p.textContent = node.content;
      main.appendChild(p);
    }
  }
  