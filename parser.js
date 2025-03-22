export function parseStructuredData(lines, index = 0) {
    let items = [];
    while (index < lines.length) {
      let line = lines[index].trim();
      // Skip empty lines or lines that start with separator (e.g., "---")
      if (!line || line.startsWith("---")) {
        index++;
        continue;
      }
      if (line === "}") {
        index++;
        break;
      }
      // Match group lines (e.g., "A: NAME {" or "D: Item Name | $value")
      let groupMatch = line.match(/^([A-E]):\s*(.+?)(\s*\{)?$/);
      if (groupMatch) {
        let level = groupMatch[1];
        let namePart = groupMatch[2].trim();
        let hasBrace = groupMatch[3] && groupMatch[3].includes("{");
        if (hasBrace) {
          // Container node – recursively parse children
          let node = { level, name: namePart, children: [] };
          index++;
          let result = parseStructuredData(lines, index);
          node.children = result[0];
          index = result[1];
          items.push(node);
        } else {
          // Check for value separator ("|" or "–")
          let leafMatch = line.match(/^([A-E]):\s*(.+?)\s*(\||–)\s*(.*)$/);
          if (leafMatch) {
            let leafLevel = leafMatch[1];
            let leafName = leafMatch[2].trim();
            let valueStr = leafMatch[4].trim();
            let value = valueStr ? parseValue(valueStr) : null;
            items.push({ level: leafLevel, name: leafName, value });
          } else {
            // Leaf with no value
            items.push({ level: groupMatch[1], name: namePart });
          }
          index++;
        }
      } else {
        console.warn("Unparsed line:", line);
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
  