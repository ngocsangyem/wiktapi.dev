<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a modern toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, and Oxfmt. Vite+ wraps these tools and package manager commands in a single, global CLI called `vp`. Vite+ is distinct from Vite, but it invokes Vite through `vp dev` and `vp build`.

## Vite+ Workflow

`vp` is a global binary that handles the full development lifecycle. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

### Install `vp`

```bash
## npm
npm install -g vite-plus

## pnpm
pnpm install -g vite-plus

## yarn
yarn global add vite-plus

#npx
npx vite-plus
```

### Vite+ Commands

- dev - Run the development server
- build - Build for production
- lint - Lint code
- test - Run tests
- fmt - Format code
- lib - Build library
- migrate - Migrate an existing project to Vite+
- new - Create a new monorepo package (in-project) or a new project (global)
- run - Run tasks from `package.json` scripts

These commands map to their corresponding tools. For example, `vp dev --port 3000` runs Vite's dev server and works the same as Vite. `vp test` runs JavaScript tests through the bundled Vitest. The version of all tools can be checked using `vp --version`. This is useful when researching documentation, features, and bugs.

### Package Manager Commands

Vite+ automatically detects and wraps the underlying package manager such as pnpm, npm, or Yarn through the `packageManager` field in `package.json` or package manager-specific lockfiles.

- install - Install all dependencies, or add packages if package names are provided
- add - Add packages to dependencies
- remove - Remove packages from dependencies
- dlx - Execute a package binary without installing it as a dependency
- info - View package information from the registry, including latest versions
- link - Link packages for local development
- outdated - Check for outdated packages
- pm - Forward a command to the package manager
- unlink - Unlink packages
- update - Update packages to their latest versions
- why - Show why a package is installed

## Common Pitfalls

- **Using the package manager directly:** Do not use pnpm, npm, or Yarn directly. Vite+ can handle all package manager operations.
- **Always use Vite commands to run tools:** Don't attempt to run `vp vitest` or `vp oxlint`. They do not exist. Use `vp test` and `vp lint` instead.
- **Running scripts:** Vite+ commands take precedence over `package.json` scripts. If there is a `test` script defined in `scripts` that conflicts with the built-in `vp test` command, run it using `vp run test`.
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly:** Vite+ wraps these tools. They must not be installed directly. You cannot upgrade these tools by installing their latest versions. Always use Vite+ commands.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

## Vue/Nuxt project

### Standards

MUST FOLLOW THESE RULES, NO EXCEPTIONS

- Stack: Vue.js, TypeScript, TailwindCSS v4, Vue Router, Pinia, Pinia Colada
- Patterns: ALWAYS use Composition API + `<script setup>`, NEVER use Options API
- ALWAYS Keep types alongside your code, use TypeScript for type safety, prefer `interface` over `type` for defining types
- Keep unit and integration tests alongside the file they test: `src/ui/Button.vue` + `src/ui/Button.spec.ts`
- ALWAYS use TailwindCSS classes rather than manual CSS
- DO NOT hard code colors, use Tailwind's color system
- ONLY add meaningful comments that explain why something is done, not what it does
- Dev server is already running on `http://localhost:5173` with HMR enabled. NEVER launch it yourself
- ALWAYS use named functions when declaring methods, use arrow functions only for callbacks
- ALWAYS prefer named exports over default exports

### Project Structure

Keep this section up to date with the project structure. Use it as a reference to find files and directories.

EXAMPLES are there to illustrate the structure, not to be implemented as-is.

```
public/ # Public static files (favicon, robots.txt, static images, etc.)
src/
├── api/ # MUST export individual functions that fetch data
│   ├── users.ts # EXAMPLE file for user-related API functions
│   └── posts.ts # EXAMPLE file for post-related API functions
├── components/ # Reusable Vue components
│   ├── ui/ # Base UI components (buttons, inputs, etc.) if any
│   ├── layout/ # Layout components (header, footer, sidebar) if any
│   └── features/ # Feature-specific components
│       └── home/ # EXAMPLE of components specific to the homepage
├── composables/ # Composition functions
├── stores/ # Pinia stores for global state (NOT data fetching)
├── queries/ # Pinia Colada queries for data fetching
│   ├── users.ts # EXAMPLE file for user-related queries
│   └── posts.ts # EXAMPLE file for post-related queries
├── pages/ # Page components (Vue Router + Unplugin Vue Router)
│   ├── (home).vue # EXAMPLE index page using a group for a better name renders at /
│   ├── users.vue # EXAMPLE that renders at /users
│   └── users.[userId].vue # EXAMPLE that renders at /users/:userId
├── plugins/ # Vue plugins
├── utils/ # Global utility pure functions
├── assets/ # Static assets that are processed by Vite (e.g CSS)
├── main.ts # Entry point for the application, add and configure plugins, and mount the app
├── App.vue # Root Vue component
└── router/ # Vue Router configuration
    └── index.ts # Router setup
```

### Project Commands

Frequently used commands:

- `pnpm run build`: bundles the project for production
- `pnpm run test`: runs all tests
- `pnpm vitest run <test-files>`: runs one or multiple specific test files
  - add `--coverage` to check missing test coverage

### Development Workflow

ALWAYS follow the workflow when implementing a new feature or fixing a bug. This ensures consistency, quality, and maintainability of the codebase.

1. Plan your tasks, review them with user. Include tests when possible
2. Write code, following the [project structure](#project-structure) and [conventions](#standards)
3. **ALWAYS test implementations work**:
   - Write tests for logic and components
   - Use the agent-browser to test like a real user
4. Stage your changes with `git add` once a feature works
5. Review changes and analyze the need of refactoring

### Testing Workflow

#### Unit and Integration Tests

- Test critical logic first
- Split the code if needed to make it testable

#### Browser Testing

1. Navigate to the relevant page
2. Wait for content to load completely
3. Test primary user interactions
4. Test secondary functionality (error states, edge cases)
5. Check the JS console for errors or warnings
   - If you see errors, investigate and fix them immediately
   - If you see warnings, document them and consider fixing if they affect user experience
6. Document any bugs found and fix them immediately

### Research & Documentation

- **NEVER hallucinate or guess URLs**
- ALWAYS try accessing the `llms.txt` file first to find relevant documentation. EXAMPLE: `https://pinia-colada.esm.dev/llms.txt`
  - If it exists, it will contain other links to the documentation for the LLMs used in this project
- ALWAYS follow existing links in table of contents or documentation indices
- Verify examples and patterns from documentation before using

## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp lint`, `vp fmt`, and `vp test` to validate changes.
<!--VITE PLUS END-->
