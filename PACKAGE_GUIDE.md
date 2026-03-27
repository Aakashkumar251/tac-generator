# Package Guide: Insight Builder v4.0

This monorepo is structured as a collection of modular packages, each serving a specific purpose in the **C-TAC Generator Pro** ecosystem. This modularity ensures a separation of concerns, easier testing, and clearer boundaries between the compiler logic, visualization tools, and the final UI.

---

## 📦 Core Packages

### 1. `@ctac/shared`
- **Significance**: Contains common interfaces, utility functions, and type definitions used across all other packages. It ensures type consistency throughout the monorepo.
- **Location**: `packages/shared`
- **Standalone Preview** (Port **8084**): Displays a health check page showing all exported types, enums, and utility functions.
  ```bash
  npm run dev --workspace=@ctac/shared
  ```

### 2. `@ctac/core-compiler`
- **Significance**: The "brain" of the project. It handles the core compiler logic including:
  - Lexing & Parsing
  - Three-Address Code (TAC) generation
  - Code analysis and formatting
- **Location**: `packages/core-compiler`
- **Standalone Preview** (Port **8081**): Interactive compiler playground — write C code, see Tokens, AST, and TAC output in real-time.
  ```bash
  npm run dev --workspace=@ctac/core-compiler
  ```

### 3. `@ctac/visualizers`
- **Significance**: Provides visualization logic and components for compiler artifacts such as:
  - Abstract Syntax Trees (AST)
  - Control Flow Graphs (CFG)
  - Symbol Tables
  - Memory Layouts
- **Location**: `packages/visualizers`
- **Standalone Preview** (Port **8082**): Tabbed harness showing all 5 viewer components with pre-compiled mock data.
  ```bash
  npm run dev --workspace=@ctac/visualizers
  ```

### 4. `@ctac/optimizers`
- **Significance**: Handles advanced compiler optimizations and code generation:
  - Register Allocation
  - Assembly Code Generation
  - Optimization passes
  - Code Stepper functionality
- **Location**: `packages/optimizers`
- **Standalone Preview** (Port **8083**): Tabbed harness showing Optimizer, Register Allocator, Assembly Viewer, Comparison View, and Step-by-Step panels.
  ```bash
  npm run dev --workspace=@ctac/optimizers
  ```

### 5. `@ctac/app-shell`
- **Significance**: The main entry point and user interface. It ties everything together, providing the code editor, navigation, and the output panels where code is visualized and optimized.
- **Location**: `packages/app-shell`
- **Dev Server** (Port **8080**): This is the package you run to use the full application.
  ```bash
  # From the root
  npm run dev

  # OR explicitly
  npm run dev --workspace=@ctac/app-shell
  ```

---

## 🚀 Quick Reference: All Dev Commands

| Package | Command | Port |
| :--- | :--- | :----: |
| **App Shell** (full app) | `npm run dev` | 8080 |
| **Core Compiler** | `npm run dev --workspace=@ctac/core-compiler` | 8081 |
| **Visualizers** | `npm run dev --workspace=@ctac/visualizers` | 8082 |
| **Optimizers** | `npm run dev --workspace=@ctac/optimizers` | 8083 |
| **Shared** | `npm run dev --workspace=@ctac/shared` | 8084 |

### Other Commands

| Command | Description |
| :--- | :--- |
| `npm run build` | Builds the **App Shell** for production |
| `npm run test` | Runs **all tests** across all packages |
| `npm run test --workspace=@ctac/<name>` | Runs tests for a specific package |

> [!TIP]
> Always run `npm install` from the root to ensure all inter-package dependencies are correctly linked.

> [!NOTE]
> On Windows CMD, if `--workspace=@ctac/<name>` doesn't work due to the `/` being interpreted as a switch, you can `cd` into the package directory and run `npx vite` directly.
