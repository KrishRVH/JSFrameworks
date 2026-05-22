import {
  COLUMN_ORDER,
  cloneColumns,
  createCard,
  createSeedState,
  moveDestination,
  normalizeTitle
} from "./seed.js";

function withColumns(state, columns) {
  return { ...state, columns };
}

function replaceCard(columns, columnId, cardId, updater) {
  return {
    ...columns,
    [columnId]: columns[columnId].map((card) =>
      card.id === cardId ? updater(card) : card
    )
  };
}

export function addCardState(state, columnId, title) {
  const normalized = normalizeTitle(title);
  if (!normalized) return state;
  return withColumns(state, {
    ...state.columns,
    [columnId]: [...state.columns[columnId], createCard(normalized)]
  });
}

export function deleteCardState(state, columnId, cardId) {
  const editing =
    state.editing?.cardId === cardId && state.editing?.columnId === columnId
      ? null
      : state.editing;
  return {
    ...state,
    editing,
    columns: {
      ...state.columns,
      [columnId]: state.columns[columnId].filter((card) => card.id !== cardId)
    }
  };
}

export function moveCardState(state, columnId, cardId, direction) {
  const targetColumnId = moveDestination(columnId, direction);
  if (!targetColumnId) return state;
  const sourceCards = state.columns[columnId];
  const card = sourceCards.find((item) => item.id === cardId);
  if (!card) return state;
  const editing =
    state.editing?.cardId === cardId && state.editing?.columnId === columnId
      ? { ...state.editing, columnId: targetColumnId }
      : state.editing;
  return {
    ...state,
    editing,
    columns: {
      ...state.columns,
      [columnId]: sourceCards.filter((item) => item.id !== cardId),
      [targetColumnId]: [...state.columns[targetColumnId], card]
    }
  };
}

export function startEditState(state, columnId, cardId) {
  const card = state.columns[columnId].find((item) => item.id === cardId);
  if (!card) return state;
  return {
    ...state,
    editing: { columnId, cardId, draftTitle: card.title }
  };
}

export function updateDraftState(state, title) {
  if (!state.editing) return state;
  return {
    ...state,
    editing: { ...state.editing, draftTitle: title }
  };
}

export function commitEditState(state) {
  if (!state.editing) return state;
  const { columnId, cardId, draftTitle } = state.editing;
  const normalized = normalizeTitle(draftTitle);
  if (!normalized) {
    return { ...state, editing: null };
  }
  return {
    ...state,
    editing: null,
    columns: replaceCard(state.columns, columnId, cardId, (card) => ({
      ...card,
      title: normalized
    }))
  };
}

export function cancelEditState(state) {
  return { ...state, editing: null };
}

export function setFilterState(state, filter) {
  return { ...state, filter };
}

export function resetState() {
  return createSeedState();
}

export function visibleCards(state, columnId) {
  const filter = state.filter.trim().toLowerCase();
  const cards = state.columns[columnId];
  if (!filter) return cards;
  return cards.filter((card) => card.title.toLowerCase().includes(filter));
}

export function totalCount(columns) {
  return COLUMN_ORDER.reduce((total, columnId) => total + columns[columnId].length, 0);
}

export function toPersistedColumns(state) {
  return cloneColumns(state.columns);
}

