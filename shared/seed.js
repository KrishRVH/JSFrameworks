export const COLUMN_ORDER = ["todo", "doing", "done"];

export const COLUMN_TITLES = {
  todo: "Todo",
  doing: "Doing",
  done: "Done"
};

export const STORAGE_KEY = "tiny-kanban:v1";

function currentStorageKey() {
  try {
    const instance = new URLSearchParams(globalThis.location.search).get("kanbanInstance")?.trim();
    return instance ? `${STORAGE_KEY}:${instance}` : STORAGE_KEY;
  } catch {
    return STORAGE_KEY;
  }
}

export function createSeedState() {
  return {
    columns: {
      todo: [{ id: "seed-1", title: "Read the spec" }],
      doing: [{ id: "seed-2", title: "Build the first rung" }],
      done: [{ id: "seed-3", title: "Compare tradeoffs" }]
    },
    filter: "",
    editing: null
  };
}

export function createCard(title) {
  return { id: crypto.randomUUID(), title };
}

export function cloneColumns(columns) {
  return Object.fromEntries(
    COLUMN_ORDER.map((columnId) => [columnId, columns[columnId].map((card) => ({ ...card }))])
  );
}

export function isValidColumns(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      COLUMN_ORDER.every(
        (columnId) =>
          Array.isArray(value[columnId]) &&
          value[columnId].every(
            (card) => card && typeof card.id === "string" && typeof card.title === "string"
          )
      )
  );
}

export function loadState() {
  const state = createSeedState();
  try {
    const raw = localStorage.getItem(currentStorageKey());
    if (!raw) {
      return state;
    }
    const parsed = JSON.parse(raw);
    const columns = parsed?.columns ? parsed.columns : parsed;
    if (isValidColumns(columns)) {
      return { ...state, columns: cloneColumns(columns) };
    }
  } catch {
    return state;
  }
  return state;
}

export function saveColumns(columns) {
  try {
    localStorage.setItem(currentStorageKey(), JSON.stringify({ columns: cloneColumns(columns) }));
  } catch {}
}

export function clearSavedBoard() {
  try {
    localStorage.removeItem(currentStorageKey());
  } catch {}
}

export function moveDestination(columnId, direction) {
  const index = COLUMN_ORDER.indexOf(columnId);
  const offset = { left: -1, right: 1 }[direction];
  if (index === -1 || !offset) {
    return null;
  }
  return COLUMN_ORDER[index + offset] ?? null;
}

export function normalizeTitle(title) {
  return String(title).trim();
}
