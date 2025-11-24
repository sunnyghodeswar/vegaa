# Module Dependencies

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                        Public API                            │
│                      (src/index.ts)                         │
└───────────────┬─────────────────────────────────────────────┘
                │
                ├─────────────────┬──────────────┬──────────────┐
                ▼                 ▼              ▼              ▼
        ┌───────────┐    ┌───────────┐   ┌──────────┐  ┌──────────┐
        │   Core    │    │  Plugins  │   │ Response │  │ Express  │
        │   App     │    │           │   │ Helpers  │  │ Compat   │
        └─────┬─────┘    └───────────┘   └──────────┘  └──────────┘
              │
              ├──────────┬──────────┬──────────┬──────────┐
              ▼          ▼          ▼          ▼          ▼
      ┌──────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
      │ Router   │ │ Context│ │ Params │ │ Cache  │ │Semaphore│
      └──────────┘ └────────┘ └────────┘ └────────┘ └────────┘
```

## Core Dependencies

### `src/index.ts`
- **Depends on**:
  - `src/core/app.ts` - App class
  - `src/plugins/*` - Built-in plugins
  - `src/utils/response.ts` - Response helpers
  - `src/core/expressCompat.ts` - Express compatibility

### `src/core/app.ts`
- **Depends on**:
  - `src/core/routeBuilder.ts` - Route builder
  - `src/core/types.ts` - Type definitions
  - `src/core/plugins.ts` - Plugin system
  - `src/router/adapter.ts` - Router
  - `src/utils/context.ts` - Context builder
  - `src/utils/params.ts` - Parameter extraction
  - `src/utils/cache.ts` - Caching
  - `src/utils/semaphore.ts` - Concurrency
  - `src/utils/port.ts` - Port management
  - `src/utils/response.ts` - Response types

### `src/core/routeBuilder.ts`
- **Depends on**:
  - `src/core/app.ts` - App class
  - `src/core/types.ts` - Handler type

### `src/router/adapter.ts`
- **Depends on**:
  - `find-my-way` (external) - HTTP router

### `src/utils/makeRequest.ts`
- **Depends on**:
  - `undici` (external) - HTTP client

## External Dependencies

### Production Dependencies
```json
{
  "fast-json-stringify": "^6.1.1",  // JSON serialization
  "find-my-way": "^9.3.0",          // HTTP router
  "undici": "^7.16.0"               // HTTP client
}
```

### Development Dependencies
```json
{
  "@types/node": "^24.7.0",          // Node.js types
  "ts-node-dev": "^2.0.0",          // Development server
  "typescript": "^5.0.0"            // TypeScript compiler
}
```

## Import Flow

### Public API (`src/index.ts`)
```typescript
import { createApp } from './core/app'        // Core
import { corsPlugin } from './plugins/cors'  // Plugins
import { html } from './utils/response'      // Utils
```

### Core App (`src/core/app.ts`)
```typescript
import { RouteBuilder } from './routeBuilder'
import { Router } from '../router/adapter'
import { buildContext } from '../utils/context'
import { extractParamNames } from '../utils/params'
```

### Plugins
```typescript
// Each plugin is independent
import type { Handler } from '../core/types'
```

## Circular Dependencies

**None** - Vegaa is designed to avoid circular dependencies:

- Core → Utils (one-way)
- Core → Router (one-way)
- Core → Plugins (one-way)
- Plugins → Core types only (types only, no runtime)

## Module Boundaries

### Public API Boundary
- **Public**: `src/index.ts` exports only
- **Private**: All other modules are internal

### Plugin Boundary
- **Interface**: `src/core/plugins.ts` defines plugin contract
- **Implementation**: `src/plugins/*` implements plugins

### Router Boundary
- **Interface**: `src/router/adapter.ts` wraps external router
- **Implementation**: `find-my-way` (external)

## Build Dependencies

### TypeScript Configs
- `tsconfig.json` - Base configuration
- `tsconfig.esm.json` - ESM build (extends base)
- `tsconfig.cjs.json` - CJS build (extends base)

### Build Scripts
- `scripts/fix-esm-extensions.cjs` - Fixes ESM imports
- `scripts/postbuild.cjs` - Post-build processing

## Dependency Injection Points

1. **Router**: Injected via `Router` class
2. **Plugins**: Registered via `app.plugin()`
3. **Middleware**: Registered via `app.middleware()`
4. **Context**: Built per-request via `buildContext()`

## External Service Dependencies

- **None** - Vegaa has no external service dependencies
- All functionality is self-contained or uses Node.js built-ins

