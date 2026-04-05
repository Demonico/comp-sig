---
name: testing
description: Testing standards and conventions. Invoke when writing or reviewing tests.
---

# Testing Standards

## Philosophy
- Write tests where they reduce meaningful risk.
- Prefer a small number of high-value tests over a large number of brittle tests.
- Prefer behavior and outcomes over implementation details.
- Keep tests readable, focused, and easy to maintain.
- Don't run tests unless explicitly instructed to do so.
- NEVER ADD TEST IDS. Always use semantic selectors (role, placeholder, text, etc.). No exceptions.
- Use static strings instead of regex. Regex should only be used when other methods don't work.

## Stack
- Vitest for unit tests
- vitest-browser-react for React component tests

Do not use React Testing Library, Jest, Cypress, or Playwright. Do not introduce alternative testing frameworks unless explicitly requested.

## What to Test First
1. Core business logic and transformations
2. Data parsing and normalization
3. Route handlers and server-side logic
4. Interactive UI behavior with meaningful user impact

Lower priority:
- Trivial presentational components
- Thin wrappers around framework features
- Markup-only components with minimal behavior

## Unit Tests
- Use Vitest for pure functions and business logic.
- Prefer testing plain functions with clear inputs and outputs.
- Cover edge cases, invalid inputs, fallback behavior, and expected failure paths.
- Keep pure logic separate from framework code when practical.
- Avoid excessive mocking. Mock only true boundaries: external APIs, clocks, randomness.

## Component Tests
- Use vitest-browser-react for React component tests.
- Test behavior through rendered UI and user interaction.
- Prefer assertions based on visible output and meaningful behavior.
- Avoid testing implementation details, internal state shape, or private helpers.
- Test important loading, empty, error, and success states when they matter to the user.

## Conventions
- Use `*.test.ts` for unit tests.
- Use `*.test.tsx` for React component tests.
- Place tests next to the source file or inside a `tests` directory when that improves clarity.
- NEVER use explicit `any` types in tests.
- Use clear test names that describe behavior.
- Keep setup minimal and explicit.
- Prefer realistic test data over overly artificial fixtures.

## What to Avoid
- Do not generate tests for code with no meaningful behavior.
- Do not tightly couple tests to fragile markup unless that markup is the behavior being verified.
- Do not add a large testing footprint before the project actually needs it.
