const STORAGE_KEY = "investment-return-calculator:form-state";

function isInputElement(element) {
  return typeof HTMLInputElement !== "undefined" && element instanceof HTMLInputElement;
}

function isSelectElement(element) {
  return typeof HTMLSelectElement !== "undefined" && element instanceof HTMLSelectElement;
}

function isStorableField(element) {
  return (isInputElement(element) || isSelectElement(element)) && Boolean(element.name);
}

function readFieldState(element) {
  if (isInputElement(element) && element.type === "checkbox") {
    return {
      checked: element.checked,
      value: element.value,
    };
  }

  return element.value;
}

function applyFieldState(field, state) {
  if (isInputElement(field) && field.type === "checkbox") {
    if (typeof state === "object" && state !== null && "checked" in state) {
      field.checked = Boolean(state.checked);
      if ("value" in state) {
        field.value = String(state.value);
      }
      return;
    }

    field.checked = state === true || state === "true" || state === "on";
    return;
  }

  field.value = String(state);
}

export function saveFormState(form) {
  try {
    const snapshot = {};

    Array.from(form.elements).forEach((element) => {
      if (!isStorableField(element)) {
        return;
      }

      snapshot[element.name] = readFieldState(element);
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage failures and keep the app usable.
  }
}

export function loadStoredFormState() {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

export function applyStoredFormState(form, state) {
  if (!state || typeof state !== "object") {
    return;
  }

  Object.entries(state).forEach(([fieldName, value]) => {
    const field = form.elements.namedItem(fieldName);

    if (isInputElement(field) || isSelectElement(field)) {
      applyFieldState(field, value);
    }
  });
}

export const __storageTestUtils = {
  applyFieldState,
  readFieldState,
};
