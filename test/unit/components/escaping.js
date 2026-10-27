import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { templates } from "../../../index.js";

// Render through the same Nunjucks environment Indiekit uses
const env = templates();
const context = {
  application: { url: "https://website.example", localeUsed: "en" },
  __: (key) => key,
};
const render = (string, locals = {}) =>
  env.renderString(string, { ...context, ...locals });

const payload = "<img src=x onerror=alert(1)>";

describe("frontend/components escape untrusted text", () => {
  it("Notification banner escapes its text", () => {
    // Text often comes straight from a query parameter, e.g. ?success=
    const html = render(
      `{% from "notification-banner/macro.njk" import notificationBanner with context %}{{ notificationBanner({ type: "success", text: text }) }}`,
      { text: payload },
    );

    assert.equal(html.includes("<img"), false);
    assert.equal(html.includes("&lt;img src=x onerror=alert(1)&gt;"), true);
  });

  it("Notification banner still renders Markdown in its text", () => {
    const html = render(
      `{% from "notification-banner/macro.njk" import notificationBanner with context %}{{ notificationBanner({ type: "success", text: text }) }}`,
      { text: "Post updated at [notes/1](/notes/1/)" },
    );

    assert.match(html, /<a href="\/notes\/1\/">notes\/1<\/a>/);
  });

  it("Notification banner escapes its text when showing error details", () => {
    const html = render(
      `{% from "notification-banner/macro.njk" import notificationBanner with context %}{{ notificationBanner({ type: "error", text: text, details: "stack" }) }}`,
      { text: payload },
    );

    assert.equal(html.includes("<img"), false);
  });

  it("Authorize escapes the client name", () => {
    const html = render(
      `{% from "authorize/macro.njk" import authorize with context %}{{ authorize({ client: { name: name, url: "https://client.example" }, me: "https://website.example", key: "Allow __client__ to access __me__" }) }}`,
      { name: payload },
    );

    assert.equal(html.includes("<img"), false);
    assert.equal(html.includes("&lt;img src=x onerror=alert(1)&gt;"), true);
  });

  it("Authorize still shows a client URL as a friendly link", () => {
    const html = render(
      `{% from "authorize/macro.njk" import authorize with context %}{{ authorize({ client: { name: name, url: name }, me: "https://website.example", key: "Allow __client__ to access __me__" }) }}`,
      { name: "https://client.example/app" },
    );

    assert.match(
      html,
      /<a href="https:\/\/client\.example\/app">client\.example\/app<\/a>/,
    );
  });
});
