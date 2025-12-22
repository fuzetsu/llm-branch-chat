# Repository Guidelines

## Project Structure & Module Organization

- `src/main.tsx` wires the SolidJS entrypoint and mounts `src/App.tsx`.
- `src/components` provides feature UIs; keep shared primitives in `src/components/ui`.
- **Complex component pattern**: When a component grows large, extract it into a folder structure:
  ```
  ComponentName/
    components/       # Local subcomponents (not reusable elsewhere)
      SubPartA.tsx
      SubPartB.tsx
    ComponentName.tsx # Main component, imports from ./components
    index.ts          # Re-exports main component
  ```
  This pattern is recursive—subcomponents can have their own `components/` folder if needed.
- `src/store` contains the main store (`AppStore.tsx`) with all state and operations, plus the API layer (`api.ts`).
- `src/utils` and `src/types` house helpers and contracts; extend them before adding ad-hoc files.

## Architecture Reference

For deeper understanding, see `docs/architecture/README.md` which indexes topic-specific documentation. Read selectively based on your task:

- **state-management.md** - Store composition, context pattern, persistence (read when modifying state or adding features)
- **services.md** - API abstraction, provider routing, streaming (read when working with API calls or adding providers)
- **message-model.md** - Node pool structure, branching logic (read when touching message display, editing, or navigation)
- **styling.md** - Theming approach, shared styles, UI patterns (read when working with styling, adding components, or theming)

## Build, Test, and Development Commands

- `npm run dev`: Vite dev server with HMR at `http://localhost:5173`.
- `npm run build`: production bundle in `dist/`; preview via `npm run serve`.
- `npm run verify-build`: lint + type-check + strict build; run before pushing.
- `npm run lint`, `npm run type-check`, `npm run format`: targeted workflows; format broad edits.

## Coding Style & Naming Conventions

- Prettier 3 (2-space indent, single quotes); run `npm run format` after sizable changes.
- ESLint (Solid + TypeScript configs); address warnings instead of disabling rules.
- PascalCase components, camelCase values, SCREAMING_SNAKE_CASE shared constants.
- Export shared props and interfaces from `src/types` to keep stores and components aligned.

## Code Comments & Documentation

Comments should explain **why**, not **what**. Add comments for:
- Complex algorithms or non-obvious design choices
- Workarounds and their necessity
- JSDoc for exported utilities with complex behavior

Avoid redundant comments:
- ❌ Structural labels (`// Header`, `// Backdrop`)
- ❌ Layout descriptions (`// Left side: controls`)
- ❌ Restating CSS classes (`// visible on lg+` for `hidden lg:block`)
- ❌ Self-documenting function names (`/** Debounces a function */` for `debounce()`)

Trust well-named code to be self-documenting. If writing an obvious comment, consider better naming instead.

## SolidJS Reactivity Tips

- Use `createSignal`/`createStore`; avoid React `useState` habits or mutating props and store slices.
- Keep derived values in `createMemo` or inline functions; never destructure signals outside their reactive scope.
- Run side effects inside `createEffect`, pair cleanup with `onCleanup`, and keep async calls out of render paths.
- Prefer `<For>` with stable keys over `.map`, and `<Show>` for conditionals instead of ternaries so Solid tracks nodes precisely.
- Native `<select>` elements need explicit `selected` attributes on `<option>` elements when options can change; relying solely on the select's `value` prop can cause visual glitches when the options array reference changes.

## Testing Guidelines

- No automated specs yet; rely on `npm run verify-build` plus manual QA around branching and provider switching.
- Adopt Vitest when adding coverage; co-locate as `<module>.test.ts[x]` and stress store-component interactions.
- Document new test scripts in `package.json` and refresh this guide.

## Commit & Pull Request Guidelines

- Follow Conventional Commits (`feat:`, `fix:`, optional scopes like `fix(ChatItem): …`).
- PRs need a concise problem/solution summary, UI screenshots or GIFs, linked issues, and verification notes.
- Keep branches focused; describe UI and store changes together so reviewers can trace data flow.
