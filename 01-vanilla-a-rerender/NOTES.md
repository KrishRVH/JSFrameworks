# Vanilla A: naive re-render

* Hard: every rendered action clears and rebuilds card DOM, so edit identity is fragile.
* Easier: render code stays straightforward because DOM never needs fine-grained reconciliation.
* New bug class: UI identity disappears unless you invent keyed preservation rules.
