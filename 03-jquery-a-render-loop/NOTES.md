# jQuery A: render loop

* Hard: same DOM identity issue as Vanilla A when whole card lists are rebuilt.
* Easier: selectors, attributes, text, and delegated events are terser.
* New bug class: jQuery ergonomics tempt DOM-as-state even though state must stay source of truth.
* Named cost: same as Vanilla A - the blur-commit rebuild swallows the first click on any
  other button while editing, wipes add-form text, and drops keyboard focus after moves.
  jQuery shortens the render code; it cannot change this tradeoff.
