// -----------------------------------------
// Copyright (c) Magnus Müller, Gregor Žunič
// [excerpt, edited]
// -----------------------------------------

const INTERACTIVE = [ "a", "button", "input", "select", "textarea", "details", "summary", "label" ];

function highlightElement(element, index) {
  if (!element) return index;
  if (!INTERACTIVE.includes(element.tagName.toLowerCase())) return index;
  if (element.isParentHighlighted) return index;
  if (!(() => {
    const style = window.getComputedStyle(element);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0" ||
      element.offsetParent === null
    ) return false;

    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const topElem = document.elementFromPoint(x, y);

    return (!topElem || element === topElem || element.contains(topElem));
  })()) return index;

  const overlays = [];

  let label = null;
  let labelWidth = 20;
  let labelHeight = 16;

  let container = document.createElement("div");
  container.style.position = "fixed";
  container.style.pointerEvents = "none";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.zIndex = "2147483647";
  container.style.backgroundColor = "transparent";
  document.body.appendChild(container);

  const rects = element.getClientRects();

  if (!rects || rects.length === 0) return index;

  const colors = [
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#FFA500",
    "#800080",
    "#008080",
    "#FF69B4",
    "#4B0082",
    "#FF4500",
    "#2E8B57",
    "#DC143C",
    "#4682B4",
  ];
  const colorIndex = index % colors.length;
  const baseColor = colors[colorIndex];
  const backgroundColor = baseColor + "1A";

  const fragment = document.createDocumentFragment();

  for (const rect of rects) {
    if (rect.width === 0 || rect.height === 0) continue;

    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.border = `2px solid ${baseColor}`;
    overlay.style.backgroundColor = backgroundColor;
    overlay.style.pointerEvents = "none";
    overlay.style.boxSizing = "border-box";

    const top = rect.top;
    const left = rect.left;

    overlay.style.top = `${top}px`;
    overlay.style.left = `${left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    fragment.appendChild(overlay);
    overlays.push({ element: overlay, initialRect: rect });
  }

  const firstRect = rects[0];
  label = document.createElement("div");
  label.className = "playwright-highlight-label";
  label.style.position = "fixed";
  label.style.background = baseColor;
  label.style.color = "white";
  label.style.padding = "1px 4px";
  label.style.borderRadius = "4px";
  label.style.fontSize = `${Math.min(12, Math.max(8, firstRect.height / 2))}px`;
  label.textContent = index.toString();

  labelWidth = label.offsetWidth > 0 ? label.offsetWidth : labelWidth;
  labelHeight = label.offsetHeight > 0 ? label.offsetHeight : labelHeight;

  const firstRectTop = firstRect.top;
  const firstRectLeft = firstRect.left;

  let labelTop = firstRectTop + 2;
  let labelLeft = firstRectLeft + firstRect.width - labelWidth - 2;

  if (firstRect.width < labelWidth + 4 || firstRect.height < labelHeight + 4) {
    labelTop = firstRectTop - labelHeight - 2;
    labelLeft = firstRectLeft + firstRect.width - labelWidth;
  }

  labelLeft = Math.max(0, Math.min(labelLeft, window.innerWidth - labelWidth));

  label.style.top = `${labelTop}px`;
  label.style.left = `${labelLeft}px`;

  fragment.appendChild(label);

  container.appendChild(fragment);

  return index + 1;
}


// -----------------------------------------
// -----------------------------------------
// -----------------------------------------


function highlight() {
  const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
  );
  const txt = [];

  let index = -1;
  let node = walker.firstChild();
  while (node) {
    try {
      const updatedIndex = highlightElement(node, index);

      const wasHighlighted = updatedIndex !== index;

      node.wasHighlighted = node.parentNode.wasHighlighted || wasHighlighted;

      wasHighlighted
        && txt.push([
            `[${index}]`,
            node.tagName,
            `"${
              node.innerText
              .trim()
              .replace(/\s+/g, " ")
            }"`
          ]
            .join(" "));

    } catch(err) {
      console.error(err);
    }

    index = updatedIndex;

    node = walker.nextNode();
  }

  return txt;
}

return highlight();