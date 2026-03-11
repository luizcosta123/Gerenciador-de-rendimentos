# Project Memory

## Overview
This repository is in its initial setup stage. There is no application code, test suite, or defined runtime stack yet.

The project should evolve through small, production-oriented increments. Agents are expected to work as pair programmers: understand context, implement the smallest useful change, validate it, and capture durable knowledge here when it matters.

## Current Status
- Repository scaffold with initial product direction defined
- First target is a web app for income and investment yield calculations
- Frontend stack chosen for v1: plain HTML, CSS, and JavaScript
- No backend required for the first thin slice
- Initial browser calculator scaffold created under `src/`
- Core calculation now has automated tests under `tests/`
- Local storage behavior now has focused regression coverage under `tests/storage.test.js`
- No package manager or dependency manifest committed yet
- CI exists via GitHub Actions for the current Node test suite

## Working Agreements
- Prefer small and reversible changes
- Keep implementation simple until real complexity appears
- Add tests alongside features, bug fixes, and meaningful refactors
- Document important technical decisions and recurring pitfalls in this file
- Ask for confirmation before destructive or high-impact architectural changes

## Decisions
- `AGENTS.md` is the repository policy for how agents should operate
- This `PROJECT.md` file is the durable memory for project-specific context and decisions
- Project structure should grow from the root using `src/`, `tests/`, `assets/`, and `docs/` as needed
- The first deliverable is a browser-based calculator with local execution only
- The first version should avoid frameworks and external dependencies unless real complexity appears
- The first end-to-end flow is `input investment data -> calculate projected yield -> display totals`

## Product Definition
The initial product is a web page where the user can calculate projected returns from investment inputs. The first version should solve one job well: take a few essential financial inputs and return a clear projection.

Initial user inputs:
- initial amount
- monthly contribution
- monthly interest rate
- investment period in months

Initial outputs:
- total invested amount
- total interest earned
- final accumulated amount

Calculation rule for the first version:
- compound monthly using the provided monthly rate
- apply the monthly contribution once per month
- keep the formula explicit and readable in code

Out of scope for v1:
- taxes
- inflation adjustment
- multiple investment products
- historical data import
- authentication
- persistence
- charts and advanced reporting

## Suggested Stack
- `src/index.html` for the interface
- `src/styles.css` for styling
- `src/calculation.js` for pure calculation logic
- `src/app.js` for DOM behavior
- `tests/calculate-yield.test.js` for the calculation checks

Rationale:
- zero build tooling
- fast iteration
- easy local execution
- enough for validating the product flow before introducing framework or backend complexity

## Open Questions
- Should the displayed rate be monthly only, or should the UI support yearly rates with conversion?
- Should the app show a month-by-month breakdown in addition to totals?
- Which hosting target should be used once the static version is ready?

## Next Recommended Steps
1. Decide whether month-by-month projection should be part of the first release.
2. Add formatting and linting once the initial files exist.
3. Choose a simple deployment target for the static app.
4. Consider support for annual rates with explicit conversion.
5. Add stronger input validation and empty-state handling in the UI.
