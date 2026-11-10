const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function createStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

function createElement() {
  return {
    addEventListener() {},
    classList: { add() {}, remove() {}, toggle() {} },
    dataset: {},
    hidden: false,
    textContent: "",
    value: "",
    innerHTML: ""
  };
}

function loadApp() {
  const elements = new Map();
  const document = {
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, createElement());
      return elements.get(selector);
    },
    querySelectorAll() {
      return [];
    }
  };
  const source = fs.readFileSync(
    path.join(__dirname, "..", "dist", "app.js"),
    "utf8"
  );
  const context = {
    document,
    localStorage: createStorage(),
    sessionStorage: createStorage(),
    setTimeout() {},
    console
  };
  vm.createContext(context);
  vm.runInContext(
    `${source}\nthis.__testApi = { accounts, navByRole, esc, initials, statusPill, save };`,
    context
  );
  return context.__testApi;
}

test("ships all demo accounts with unique credentials and roles", () => {
  const { accounts } = loadApp();

  assert.equal(accounts.length, 6);
  assert.equal(new Set(accounts.map(account => account.email)).size, accounts.length);
  assert.deepEqual(
    Array.from(accounts, account => account.role),
    ["Administrator", "Student", "Faculty", "Operator", "Viewer", "Applicant"]
  );
});

test("esc escapes characters that could be interpreted as HTML", () => {
  const { esc } = loadApp();

  assert.equal(
    esc(`<script>alert("x")</script> & 'quoted'`),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;quoted&#39;"
  );
});

test("initials uses at most the first two name parts", () => {
  const { initials } = loadApp();

  assert.equal(initials("Vladyslav Konrad"), "VK");
  assert.equal(initials("Mary Jane Watson"), "MJ");
});

test("status pills use semantic classes and escape the label", () => {
  const { statusPill } = loadApp();

  assert.match(statusPill("Active"), /pill--success/);
  assert.match(statusPill("Pending"), /pill--pending/);
  assert.match(statusPill("Inactive"), /pill--inactive/);
  assert.match(statusPill("<unsafe>"), /&lt;unsafe&gt;/);
});

test("role navigation exposes only the workflows assigned to each role", () => {
  const { navByRole } = loadApp();

  assert.deepEqual(Array.from(navByRole.Viewer, ([id]) => id), [
    "dashboard",
    "reports",
    "status"
  ]);
  assert.deepEqual(Array.from(navByRole.Applicant, ([id]) => id), [
    "home",
    "notifications",
    "profile",
    "status"
  ]);
});
