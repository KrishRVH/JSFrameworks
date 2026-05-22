# jQuery B: incremental DOM updates

* Hard: add, delete, move, filter, counts, and editing each need manual DOM invariant care.
* Easier: direct node patching feels fast for small flows.
* New bug class: state and DOM can diverge when one incremental path forgets an invariant.

