Mod: Haunted House
Version: 1.0.0
Author: Example
Description: Adds an old house to explore, reached from the town square.
Requires: >=1.9.0

// Lines starting with // or # up here are comments.
// Everything below is Twee-like: a "::" line starts a section.

:: after Town Square
[[Investigate the old house->Old House]]

:: Old House [skip unsafe-room]
<<skipto "Garden">>
<<skipsummary>>You search the house and slip out through the garden.<</skipsummary>>
The door creaks open onto a dark hall.

[[Go upstairs->Attic]]
[[Leave->Town Square]]

:: Attic [safe-room]
Dust, old letters, and a brass key on a nail.

[[Back down->Old House]]

:: Garden
Overgrown roses hide a gate back to town.

[[Return to town->Town Square]]

:: items
[
  { "id": "brass-key", "name": "Brass Key", "description": "Opens the attic.", "tags": ["quest"] }
]
