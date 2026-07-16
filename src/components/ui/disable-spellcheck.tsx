"use client";

import { useEffect } from "react";

const TEXT_ENTRY_SELECTOR = "input, textarea, [contenteditable]";

function disableSpellcheck(element: Element) {
  if (!(element instanceof HTMLElement)) return;
  element.setAttribute("spellcheck", "false");
  element.spellcheck = false;
}

function disableSpellcheckInTree(root: ParentNode) {
  if (root instanceof Element && root.matches(TEXT_ENTRY_SELECTOR)) {
    disableSpellcheck(root);
  }

  root.querySelectorAll(TEXT_ENTRY_SELECTOR).forEach(disableSpellcheck);
}

export function DisableSpellcheck() {
  useEffect(() => {
    disableSpellcheckInTree(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) disableSpellcheckInTree(node);
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
