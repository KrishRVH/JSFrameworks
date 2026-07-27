# Vanilla A: naive re-render

* Hard: every rendered action clears and rebuilds card DOM, so edit identity is fragile.
* Easier: render code stays straightforward because DOM never needs fine-grained reconciliation.
* New bug class: UI identity disappears unless you invent keyed preservation rules.
* Named cost: clicking any button while an edit is open loses that click. The blur-commit
  re-renders first, the mousedown target is destroyed, and the browser never delivers the
  click - the user has to click twice.
* Named cost: a full rebuild also wipes unrelated in-progress input, like text typed into
  another column's add form, and drops keyboard focus after Left/Right/Delete.
