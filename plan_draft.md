# Planning document

## Bugs

These bugs should be investigated and fixed. Create a {curDateTime}\_BUGFIX.md tech document with
a high level (no code) plan of the implementation referring to code areas through ui component names
and related code responsibilities e.g. "the modal code"

- the default model setting resets whenever the model list is edited, it should remain selected
  unless that particular model is removed from the list
- when switching between different branches and sub branches I've lost data sometimes, the logic
  there is buggy and the data model itself is not ideal, we should investigate and fix this bug and
  consider refactoring how we store and track branches to make it clearer and more reliable

## Small Features

- copy message action - copies message content to clipboard using navigator.writeText

## Features

- the settings modal UX is a bit wonky, instead of having the whole modal scrollable, it would be
  nice if the header and footer of the model were fixed with just the center part scrollable, so that
  the user doesn't need to scroll down to see the "Save" action
