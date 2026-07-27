# jQuery A: render loop

* Hard: same DOM identity issue as Vanilla A when whole card lists are rebuilt.
* Easier: selectors, attributes, text, and delegated events are terser.
* New bug class: jQuery ergonomics tempt DOM-as-state even though state must stay source of truth.
* Named cost: exactly like Vanilla A, the blur-commit rebuild swallows the first click on any
  other button while editing, wipes in-progress add-form text, and drops keyboard focus after
  Left/Right/Delete. jQuery shortens the render code but cannot change this tradeoff.
