export function showDrilldown(node, drilldownStack = []) {
    const content = document.getElementById("content");
    content.innerHTML = "";
  
    // Header with title and Back button if applicable.
    let headerDiv = document.createElement("div");
    headerDiv.className = "drilldown-header";
    let title = document.createElement("h2");
    title.textContent = node.name || "Categories";
    headerDiv.appendChild(title);
    if (drilldownStack.length > 0) {
      let backBtn = document.createElement("button");
      backBtn.textContent = "Back";
      backBtn.className = "back-btn";
      backBtn.addEventListener("click", () => {
        let parent = drilldownStack.pop();
        showDrilldown(parent, drilldownStack);
      });
      headerDiv.appendChild(backBtn);
    }
    content.appendChild(headerDiv);
  
    // Display children as clickable cards.
    if (node.children && node.children.length > 0) {
      let grid = document.createElement("div");
      grid.className = "item-grid";
      node.children.forEach(child => {
        let card = document.createElement("div");
        card.className = "item-card";
        card.innerHTML = `<h3>${child.name}</h3>`;
        if ((child.level === "D" || child.level === "E") && child.value !== undefined) {
          card.innerHTML += `<p>Value: $${Math.abs(child.value).toLocaleString()}</p>`;
        }
        card.addEventListener("click", () => {
          if (child.children && child.children.length > 0) {
            drilldownStack.push(node);
            showDrilldown(child, drilldownStack);
          } else {
            showDetail(child, drilldownStack);
          }
        });
        grid.appendChild(card);
      });
      content.appendChild(grid);
    } else {
      showDetail(node, drilldownStack);
    }
  }
  
  export function showDetail(node, drilldownStack = []) {
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
        showDrilldown(parent, drilldownStack);
      } else {
        window.dispatchEvent(new Event("homeRequested"));
      }
    });
    headerDiv.appendChild(backBtn);
    content.appendChild(headerDiv);
  
    if ((node.level === "D" || node.level === "E") && node.value !== undefined) {
      let p = document.createElement("p");
      p.textContent = `Value: $${Math.abs(node.value).toLocaleString()}`;
      content.appendChild(p);
    }
  }
  