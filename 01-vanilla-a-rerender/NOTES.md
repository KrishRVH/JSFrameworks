# Vanilla A: naive re-render

* Hard: every action clears and rebuilds card DOM, so edit input loses focus/cursor while typing.
* Easier: render code stays straightforward because DOM never needs fine-grained reconciliation.
* New bug class: UI identity disappears unless you invent keyed preservation rules.

