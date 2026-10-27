import { markdownParser } from "../markdown-it.js";

/**
 * Add Markdown link to text
 * @param {string} string - Text
 * @param {string} href - Hyperlink reference to link to
 * @returns {string} Markdown string
 */
export const linkTo = (string, href) => {
  if (href) {
    return `[${string}](${href})`;
  }

  return string;
};

/**
 * Render Markdown string as HTML
 * @param {string} string - Markdown
 * @param {string} [value] - If ‘inline’, HTML rendered without paragraph tags
 * @returns {string} HTML
 */
export const markdown = (string, value) => {
  // markdown-it only accepts primitive strings, not Nunjucks’ SafeString, which
  // is what text passed through the `escape` filter becomes
  string = String(string);

  if (value === "inline") {
    return markdownParser().renderInline(string);
  }

  return markdownParser().render(string);
};
