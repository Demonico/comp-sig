@AGENTS.md

# Database Rules
- Never use JSON columns in the database.

# Coding Standards

## General
- Use TypeScript for all application code.
- NEVER use explicit `any` types. No exceptions. Prefer `unknown` or specific interfaces.
- Use functional components and functions. Avoid classes unless truly required.
- Prefer named exports by default.
- Use descriptive variable and function names.
- Keep files focused and cohesive.
- Component files should not be more than 150 lines.
- Prefer straightforward code over clever abstractions.
- Remove dead code, unused imports, and unused variables.
- Use early returns and guard clauses to keep logic readable.
- Handle loading, empty, and error states explicitly.
- Do NOT modify any hidden files (files starting with a dot) unless explicitly instructed.

## Dependency Policy
- Do not introduce new dependencies unless explicitly requested.
- Do not assume the presence of libraries that are not in `package.json`.
- Prefer built-in React, Next.js, and browser/platform features first.
- When suggesting a new dependency, explain why the built-in approach is not sufficient.
- Do NOT run `pnpm install`, `pnpm add`, or any commands that modify dependencies. If new dependencies are needed, inform the user and ask them to install manually.

## Next.js App Router
- Prefer Server Components by default.
- Add `'use client'` only when browser APIs, client-side interactivity, or client state are required.
- Prefer server-side data fetching when possible.
- Keep route handlers and server actions thin.
- Co-locate code with the route or feature when it improves clarity.
- Do not recreate framework features manually when Next.js already provides them.

## React
- Keep components small and composable.
- Extract reusable logic into custom hooks only when reuse or clarity justifies it.
- Do not add memoization (`useMemo`, `useCallback`, `React.memo`) by default. Only optimize after there is a clear reason.
- Avoid unnecessary `useEffect`. Prefer declarative data flow and derived values.
- Do not use `prop-types`. Use TypeScript types for props.

## State Management
- Prefer local component state first.
- Lift state up only when needed.
- Do not introduce a global state library unless the app has a real shared-state problem that justifies it.
- Prefer URL state, server state, and component state before adding client-side global state.

## Styling
- Use Tailwind CSS for styling.
- Do not introduce CSS-in-JS, Sass, or other styling systems unless explicitly requested.
- Prefer utility classes and simple composition.
- Use semantic HTML and accessible markup.
- Build mobile-first layouts.

## UI Components
- Prefer simple app-specific components first.
- Do not assume shadcn/ui, Radix, MUI, Chakra, or other UI libraries are available.
- If a reusable component pattern emerges, extract it after repetition is real.
- Never include development metadata or agent instructions as text in the UI.

## Forms and Validation
- Use native React and browser capabilities unless a more robust form solution is explicitly needed.
- Validate critical input on the server.
- Do not assume react-hook-form, Zod, or other validation libraries are installed.

## Data and API Design
- Keep API boundaries simple and explicit.
- Prefer clear input/output types.
- Avoid premature generic abstractions.
- Make it easy to swap mocked data for real integrations later.

## Accessibility
- Use semantic HTML first.
- Ensure interactive elements are keyboard accessible.
- Use ARIA only when semantic HTML is insufficient.
- Include labels, alt text, and accessible names where appropriate.

## Project Awareness
Before making changes, align with:
1. The current `package.json`
2. The existing repository structure
3. The project docs and specs
4. The current phase of the app
