import TurndownService from "turndown";
import { gfm } from "@truto/turndown-plugin-gfm";
class Turndown {
  service;
  constructor(retainElementCbs = []) {
    const isRetained = (node) => {
      if (node.nodeType !== 1) return false;
      const elementNode = node;
      for (const retainElementCb of retainElementCbs) {
        if (retainElementCb(elementNode)) return true;
      }
      return false;
    };
    const collectRetained = (node) => {
      if (isRetained(node)) return [node];
      const found = [];
      for (const child of Array.from(node.childNodes ?? [])) {
        found.push(...collectRetained(child));
      }
      return found;
    };
    this.service = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
      // Turndown consults its blank rule before any custom rule, and its
      // "meaningful when blank" list holds no BUTTON, SELECT or TEXTAREA. A
      // control left without text — an icon button whose icon was lifted away —
      // was therefore discarded before the retain rule below could keep it, as
      // was every control inside a textless wrapper.
      blankReplacement: (_content, node) => {
        const retained = collectRetained(node);
        if (retained.length) {
          return retained.map((elementNode) => elementNode.outerHTML).join("");
        }
        return node.isBlock ? "\n\n" : "";
      }
    });
    this.service.addRule("retain", {
      filter: (node) => isRetained(node),
      replacement: (_content, node) => node.outerHTML
    });
    this.service.use(gfm);
  }
  translate(html) {
    return this.service.turndown(html).trim();
  }
}
export {
  Turndown
};
