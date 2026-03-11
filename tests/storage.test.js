import test from "node:test";
import assert from "node:assert/strict";

import {
  __storageTestUtils,
  applyStoredFormState,
  loadStoredFormState,
  saveFormState,
} from "../src/lib/storage.js";

class MockInputElement {
  constructor({ name = "", type = "text", value = "", checked = false } = {}) {
    this.name = name;
    this.type = type;
    this.value = value;
    this.checked = checked;
  }
}

class MockSelectElement {
  constructor({ name = "", value = "" } = {}) {
    this.name = name;
    this.value = value;
  }
}

global.HTMLInputElement = MockInputElement;
global.HTMLSelectElement = MockSelectElement;

test("saveFormState persists checkbox checked state", () => {
  let storedValue = null;
  global.localStorage = {
    setItem(_key, value) {
      storedValue = value;
    },
  };

  const form = {
    elements: [
      new MockInputElement({ name: "initialAmount", value: "1000" }),
      new MockInputElement({
        name: "useCustomContributions",
        type: "checkbox",
        value: "on",
        checked: true,
      }),
    ],
  };

  saveFormState(form);

  assert.deepEqual(JSON.parse(storedValue), {
    initialAmount: "1000",
    useCustomContributions: {
      checked: true,
      value: "on",
    },
  });
});

test("applyStoredFormState restores checkbox checked state", () => {
  const fields = new Map([
    ["initialAmount", new MockInputElement({ name: "initialAmount", value: "" })],
    [
      "useCustomContributions",
      new MockInputElement({
        name: "useCustomContributions",
        type: "checkbox",
        value: "on",
        checked: false,
      }),
    ],
  ]);

  const form = {
    elements: {
      namedItem(name) {
        return fields.get(name) ?? null;
      },
    },
  };

  applyStoredFormState(form, {
    initialAmount: "1500",
    useCustomContributions: {
      checked: true,
      value: "on",
    },
  });

  assert.equal(fields.get("initialAmount").value, "1500");
  assert.equal(fields.get("useCustomContributions").checked, true);
});

test("loadStoredFormState returns null for invalid JSON", () => {
  global.localStorage = {
    getItem() {
      return "{invalid json";
    },
  };

  assert.equal(loadStoredFormState(), null);
});

test("storage helpers support backward-compatible checkbox restoration", () => {
  const checkbox = new MockInputElement({
    name: "useCustomContributions",
    type: "checkbox",
    value: "on",
    checked: false,
  });

  __storageTestUtils.applyFieldState(checkbox, "on");

  assert.equal(checkbox.checked, true);
  assert.deepEqual(__storageTestUtils.readFieldState(checkbox), {
    checked: true,
    value: "on",
  });
});
