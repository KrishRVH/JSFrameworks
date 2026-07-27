// Operations measured on every rung. Each is defined as page-context function source:
// `setup` runs before the clock starts (and settles), `action` is what gets timed,
// `predicate` marks logical completion (script time); paint time is two rAFs later.
// Inputs are driven through native value setters + InputEvent so controlled inputs
// (React) and bindings (Svelte) see them exactly like real typing.

const SET_INPUT = `const setInput = (input, value) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, value);
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
};`;

function todoCount() {
  return `document.querySelectorAll(".board .column:nth-child(1) .card").length`;
}

export function makeScenarios(cardCount) {
  const perColumn = Math.ceil(cardCount / 3);
  const alphaCount = perColumn;

  return [
    {
      id: "add-card",
      label: "Add one card",
      action: `() => {
        ${SET_INPUT}
        const form = document.querySelector(".board .column:nth-child(1) .add-form");
        setInput(form.querySelector("input"), "bench added card");
        form.requestSubmit();
      }`,
      predicate: `() => ${todoCount()} === ${perColumn + 1}`
    },
    {
      id: "delete-middle",
      label: "Delete middle card",
      action: `() => {
        const cards = document.querySelectorAll(".board .column:nth-child(1) .card");
        cards[Math.floor(cards.length / 2)]
          .querySelector(".card-actions button:nth-child(3)")
          .click();
      }`,
      predicate: `() => ${todoCount()} === ${perColumn - 1}`
    },
    {
      id: "move-card",
      label: "Move card right",
      action: `() => {
        document
          .querySelector(".board .column:nth-child(1) .card .card-actions button:nth-child(2)")
          .click();
      }`,
      predicate: `() => ${todoCount()} === ${perColumn - 1}`
    },
    {
      id: "start-edit",
      label: "Open inline edit",
      action: `() => {
        document.querySelector(".board .column:nth-child(1) .card .card-title-button").click();
      }`,
      predicate: `() => Boolean(document.querySelector(".board .column:nth-child(1) .card input"))`
    },
    {
      id: "draft-keystroke",
      label: "Draft keystroke",
      setup: [
        `() => {
          document.querySelector(".board .column:nth-child(1) .card .card-title-button").click();
        }`
      ],
      action: `() => {
        ${SET_INPUT}
        setInput(document.querySelector(".board .column:nth-child(1) .card input"), "draft x");
      }`,
      predicate: null
    },
    {
      id: "commit-edit",
      label: "Commit edited title",
      setup: [
        `() => {
          document.querySelector(".board .column:nth-child(1) .card .card-title-button").click();
        }`,
        `() => {
          ${SET_INPUT}
          setInput(
            document.querySelector(".board .column:nth-child(1) .card input"),
            "bench committed title"
          );
        }`
      ],
      action: `() => {
        document
          .querySelector(".board .column:nth-child(1) .card input")
          .dispatchEvent(
            new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
          );
      }`,
      predicate: `() => !document.querySelector(".board .column:nth-child(1) .card input")`
    },
    {
      id: "filter-type",
      label: `Filter to ${alphaCount} of ${cardCount}`,
      action: `() => {
        ${SET_INPUT}
        setInput(document.querySelector(".toolbar input"), "alpha");
      }`,
      predicate: `() => document.querySelectorAll(".board .card").length === ${alphaCount}`
    },
    {
      id: "filter-clear",
      label: "Clear filter",
      setup: [
        `() => {
          ${SET_INPUT}
          setInput(document.querySelector(".toolbar input"), "alpha");
        }`
      ],
      action: `() => {
        ${SET_INPUT}
        setInput(document.querySelector(".toolbar input"), "");
      }`,
      predicate: `() => document.querySelectorAll(".board .card").length === ${cardCount}`
    },
    {
      id: "reset",
      label: "Reset board",
      action: `() => {
        document.querySelector(".toolbar button").click();
      }`,
      predicate: `() => document.querySelectorAll(".board .card").length === 3`
    }
  ];
}
