export const $ = (id) => document.getElementById(id);

// Hyperscript-style element builder.
//   h("button", { class: "btn", onClick: fn, disabled: true }, "Label", childNode)
// Props: "class", "dataset" (object), "on<Event>" listeners, booleans become
// bare attributes, null/undefined/false are skipped. Children may be nested
// arrays, strings, numbers or nodes.
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key === "dataset") Object.assign(el.dataset, value);
    else if (key.startsWith("on")) el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, "");
    else el.setAttribute(key, String(value));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

// Builds an inline SVG from trusted, hard-coded path markup only.
export function svg(markup, size = 20) {
  const wrap = document.createElement("span");
  wrap.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${markup}</svg>`;
  return wrap.firstElementChild;
}
