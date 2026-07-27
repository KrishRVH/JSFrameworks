# jQuery B: incremental DOM updates

* Hard: add, delete, move, filter, counts, and editing each need manual DOM invariant care.
* Easier: direct node patching feels fast for small flows.
* New bug class: state and DOM can diverge when one incremental path forgets an invariant.
* Named cost: moving a card uses `detach()` + `append()`, so keyboard focus on the pressed
  Left/Right button is lost; a keyboard user must re-tab to the card after every move.

