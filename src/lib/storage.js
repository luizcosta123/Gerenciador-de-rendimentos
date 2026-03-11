const STORAGE_KEY = "investment-return-calculator:form-state";

function isStorableField(element) {
  return (
    element instanceof HTMLInputElement || element instanceof HTMLSelectElement
  ) && Boolean(element.name);
}

export function saveFormState(form) {
  try {
    const snapshot = {};

    Array.from(form.elements).forEach((element) => {
      if (!isStorableField(element)) {
        return;
      }

      snapshot[element.name] = element.value;
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

    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
      field.value = String(value);
    }
  });
}
