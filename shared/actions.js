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

function isEditingCard(state, columnId, cardId) {
  return state.editing?.columnId === columnId && state.editing.cardId === cardId;
}

function replaceCard(columns, columnId, cardId, updater) {
  return {
    ...columns,
    [columnId]: columns[columnId].map((card) => (card.id === cardId ? updater(card) : card))
  };
}

export function addCardState(state, columnId, title) {
  const normalized = normalizeTitle(title);
  if (!normalized) {
    return state;
  }
  return withColumns(state, {
    ...state.columns,
    [columnId]: [...state.columns[columnId], createCard(normalized)]
  });
}

export function deleteCardState(state, columnId, cardId) {
  const editing = isEditingCard(state, columnId, cardId) ? null : state.editing;
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
  if (!targetColumnId) {
    return state;
  }
  const sourceCards = state.columns[columnId];
  const card = sourceCards.find((item) => item.id === cardId);
  if (!card) {
    return state;
  }
  const editing = isEditingCard(state, columnId, cardId)
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
  if (!card) {
    return state;
  }
  return {
    ...state,
    editing: { columnId, cardId, draftTitle: card.title }
  };
}

export function updateDraftState(state, title) {
  if (!state.editing || state.editing.draftTitle === title) {
    return state;
  }
  return {
    ...state,
    editing: { ...state.editing, draftTitle: title }
  };
}

export function commitEditState(state) {
  if (!state.editing) {
    return state;
  }
  const { columnId, cardId, draftTitle } = state.editing;
  const normalized = normalizeTitle(draftTitle);
  const card = state.columns[columnId].find((item) => item.id === cardId);
  if (!normalized || !card || card.title === normalized) {
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
  if (!state.editing) {
    return state;
  }
  return { ...state, editing: null };
}

export function setFilterState(state, filter) {
  if (state.filter === filter) {
    return state;
  }
  return { ...state, filter };
}

export function resetState() {
  return createSeedState();
}

export function visibleCards(state, columnId) {
  return state.columns[columnId].filter((card) => cardMatchesFilter(card, state.filter));
}

export function totalCount(columns) {
  return COLUMN_ORDER.reduce((total, columnId) => total + columns[columnId].length, 0);
}

export function toPersistedColumns(state) {
  return cloneColumns(state.columns);
}

export function cardMatchesFilter(card, filter) {
  const normalized = filter.trim().toLowerCase();
  return !normalized || card.title.toLowerCase().includes(normalized);
}
