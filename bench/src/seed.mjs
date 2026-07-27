// Deterministic board generator. Cards are spread across the three columns; every
// third title carries the token "alpha" so filter scenarios select a stable subset.
export function makeBoard(cardCount) {
  const columns = { todo: [], doing: [], done: [] };
  const names = ["todo", "doing", "done"];
  for (let index = 0; index < cardCount; index += 1) {
    const flavor = index % 3 === 0 ? "alpha" : "beta";
    columns[names[index % 3]].push({
      id: `bench-${index}`,
      title: `Card ${index} ${flavor}`
    });
  }
  return columns;
}

export function expectedVisible(cardCount, filter) {
  const columns = makeBoard(cardCount);
  const all = [...columns.todo, ...columns.doing, ...columns.done];
  const normalized = filter.trim().toLowerCase();
  return all.filter((card) => !normalized || card.title.toLowerCase().includes(normalized)).length;
}
