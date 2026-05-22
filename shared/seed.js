export const COLUMN_ORDER = ["todo", "doing", "done"];

export const COLUMN_TITLES = {
  todo: "Todo",
  doing: "Doing",
  done: "Done"
};

export const STORAGE_KEY = "tiny-kanban:v1";

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
    COLUMN_ORDER.map((columnId) => [
      columnId,
      columns[columnId].map((card) => ({ ...card }))
    ])
  );
}

export function isValidColumns(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      COLUMN_ORDER.every((columnId) =>
        Array.isArray(value[columnId]) &&
        value[columnId].every(
          (card) =>
            card &&
            typeof card.id === "string" &&
            typeof card.title === "string"
        )
      )
  );
}

export function loadState() {
  const state = createSeedState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return state;
    const parsed = JSON.parse(raw);
    const columns = parsed && parsed.columns ? parsed.columns : parsed;
    if (isValidColumns(columns)) {
      state.columns = cloneColumns(columns);
    }
  } catch {
    return state;
  }
  return state;
}

export function saveColumns(columns) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ columns: cloneColumns(columns) }));
}

export function clearSavedBoard() {
  localStorage.removeItem(STORAGE_KEY);
}

export function columnForCard(columns, cardId) {
  return COLUMN_ORDER.find((columnId) =>
    columns[columnId].some((card) => card.id === cardId)
  );
}

export function moveDestination(columnId, direction) {
  const index = COLUMN_ORDER.indexOf(columnId);
  const offset = direction === "left" ? -1 : 1;
  return COLUMN_ORDER[index + offset] ?? null;
}

export function normalizeTitle(title) {
  return title.trim();
}
