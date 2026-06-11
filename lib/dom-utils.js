/**
 * Safe DOM helpers — avoid direct innerHTML assignment (AMO addons-linter).
 */

/**
 * Remove all child nodes from an element.
 * @param {Element | null | undefined} el
 */
export function clearElement(el) {
  if (el) el.replaceChildren();
}

/**
 * Insert trusted HTML from bundled i18n or other compile-time-trusted sources.
 * Uses DOMParser instead of innerHTML assignment.
 * @param {Element} el
 * @param {string} htmlString
 */
export function setTrustedHtml(el, htmlString) {
  if (!el || !htmlString) {
    clearElement(el);
    return;
  }
  const doc = new DOMParser().parseFromString(htmlString, 'text/html');
  el.replaceChildren(...doc.body.childNodes);
}
