# Vegaa Directory Structure

## Project Layout

```
vegajs/
├── assets/                    # Static assets (banners, images)
│   └── vegaa-banner.png
│
├── dist/                      # Build output (gitignored)
│   ├── cjs/                   # CommonJS build
│   │   ├── core/
│   │   ├── plugins/
│   │   ├── router/
│   │   ├── utils/
│   │   └── index.js
│   └── esm/                   # ES Module build
│       ├── core/
│       ├── plugins/
│       ├── router/
│       ├── utils/
│       └── index.js
│
├── docs/                      # Documentation
│   ├── analysis/             # Development analysis (gitignored)
│   ├── architecture/         # Architecture documentation
│   ├── structure/            # Structure documentation
│   ├── implementation/       # Implementation details (gitignored)
│   ├── guides/               # User guides
│   └── api/                  # API documentation
│
├── examples/                  # Pure JavaScript examples
│   ├── basic.js
│   ├── crud.js
│   ├── middleware.js
│   ├── response-helpers.js
│   ├── express-middleware.js
│   ├── http-client.js
│   └── README.md
│
├── scripts/                   # Build scripts
│   ├── fix-esm-extensions.cjs
│   └── postbuild.cjs
│
├── src/                       # Source code
│   ├── core/                 # Core framework
│   │   ├── app.ts            # Main App class
│   │   ├── routeBuilder.ts   # Route builder pattern
│   │   ├── types.ts          # TypeScript types
│   │   ├── plugins.ts        # Plugin system
│   │   ├── expressCompat.ts  # Express compatibility
│   │   └── global.d.ts       # Global type definitions
│   │
│   ├── plugins/              # Built-in plugins
│   │   ├── cors.ts
│   │   ├── json.ts
│   │   ├── bodyParser.ts
│   │   ├── static.ts
│   │   └── httpClient.ts
│   │
│   ├── router/                # Router implementation
│   │   ├── adapter.ts        # find-my-way adapter
│   │   └── router.ts         # Router wrapper
│   │
│   ├── utils/                 # Utility functions
│   │   ├── context.ts        # Context builder
│   │   ├── params.ts         # Parameter extraction
│   │   ├── response.ts       # Response helpers
│   │   ├── cache.ts          # Caching utilities
│   │   ├── semaphore.ts      # Concurrency control
│   │   ├── port.ts           # Port management
│   │   └── makeRequest.ts    # HTTP client builder
│   │
│   ├── example/               # TypeScript examples
│   │   ├── app.ts
│   │   ├── express-compat-example.ts
│   │   ├── functional-response-example.ts
│   │   └── static-example.ts
│   │
│   ├── plugins.ts             # Plugin exports
│   └── index.ts               # Public API entry point
│
├── .editorconfig              # Editor configuration
├── .gitignore                 # Git ignore rules
├── .npmignore                 # NPM ignore rules
├── .prettierignore           # Prettier ignore rules
├── CHANGELOG.md              # Version history
├── LICENSE                   # MIT License
├── package.json              # Package configuration
├── README.md                 # Main documentation
├── tsconfig.json             # TypeScript config (base)
├── tsconfig.cjs.json         # TypeScript config (CJS)
└── tsconfig.esm.json         # TypeScript config (ESM)
```

## Source Code Structure

### Core (`src/core/`)

#### `app.ts` - Main Application Class
- **Purpose**: Core application logic
- **Key Classes**: `App`, `createApp()`
- **Responsibilities**:
  - Route registration
  - Middleware management
  - Request handling
  - Server lifecycle
  - Cluster mode

#### `routeBuilder.ts` - Route Builder Pattern
- **Purpose**: Fluent API for route definition
- **Key Class**: `RouteBuilder`
- **Methods**: `.get()`, `.post()`, `.put()`, `.delete()`, `.middleware()`

#### `types.ts` - Type Definitions
- **Purpose**: TypeScript type definitions
- **Key Types**: `Context`, `Handler`, `Route`, `MiddlewareEntry`

#### `plugins.ts` - Plugin System
- **Purpose**: Plugin registration and validation
- **Key Function**: `isPlugin()`

#### `expressCompat.ts` - Express Compatibility
- **Purpose**: Express middleware support
- **Key Function**: `enableExpressCompat()`

### Plugins (`src/plugins/`)

#### `cors.ts` - CORS Plugin
- **Purpose**: Cross-Origin Resource Sharing
- **Export**: `corsPlugin`, `corsMiddleware()`

#### `json.ts` - JSON Plugin
- **Purpose**: JSON parsing middleware
- **Export**: `jsonPlugin`, `jsonMiddleware`

#### `bodyParser.ts` - Body Parser Plugin
- **Purpose**: Request body parsing (JSON, URL-encoded, text)
- **Export**: `bodyParserPlugin`, `bodyParser()`

#### `static.ts` - Static File Plugin
- **Purpose**: Serve static files
- **Export**: `staticPlugin`, `createStaticMiddleware()`

#### `httpClient.ts` - HTTP Client Plugin
- **Purpose**: External HTTP requests
- **Export**: `httpClientPlugin`

### Router (`src/router/`)

#### `adapter.ts` - Router Adapter
- **Purpose**: Wrapper around `find-my-way`
- **Key Class**: `Router`
- **Methods**: `.on()`, `.find()`

#### `router.ts` - Router Wrapper
- **Purpose**: Additional router utilities

### Utils (`src/utils/`)

#### `context.ts` - Context Builder
- **Purpose**: Create request context
- **Key Function**: `buildContext()`

#### `params.ts` - Parameter Extraction
- **Purpose**: Extract and compile function parameters
- **Key Functions**: `extractParamNames()`, `compileArgBuilder()`

#### `response.ts` - Response Helpers
- **Purpose**: HTML, text, file response helpers
- **Exports**: `html()`, `text()`, `file()`

#### `cache.ts` - Caching
- **Purpose**: In-memory caching with TTL
- **Key Function**: `cacheGetOrSet()`

#### `semaphore.ts` - Concurrency Control
- **Purpose**: Limit concurrent requests
- **Key Class**: `Semaphore`

#### `port.ts` - Port Management
- **Purpose**: Find available ports
- **Key Function**: `findAvailablePort()`

#### `makeRequest.ts` - HTTP Client Builder
- **Purpose**: Builder pattern for HTTP requests
- **Key Function**: `makeRequest()`

## Build Output Structure

### CommonJS (`dist/cjs/`)
- **Format**: CommonJS modules (`require()`)
- **Target**: Node.js environments
- **Entry**: `dist/cjs/index.js`

### ES Modules (`dist/esm/`)
- **Format**: ES modules (`import`)
- **Target**: Modern Node.js and bundlers
- **Entry**: `dist/esm/index.js`
- **Types**: `dist/esm/index.d.ts`

## Documentation Structure

### `docs/architecture/`
- Architecture overview
- Request lifecycle
- Design patterns
- Performance considerations

### `docs/structure/`
- Directory structure
- File organization
- Module dependencies

### `docs/implementation/` (gitignored)
- Internal implementation details
- Development notes
- Analysis documents

### `docs/guides/`
- User guides
- Tutorials
- Best practices

### `docs/api/`
- API reference
- Public API documentation
- Type definitions

## Key Design Decisions

1. **Separation of Concerns**: Core, plugins, router, utils are separate
2. **Type Safety**: Full TypeScript support with type definitions
3. **Dual Build**: Both CJS and ESM for maximum compatibility
4. **Plugin Architecture**: Extensible via plugin system
5. **Minimal Dependencies**: Only essential external dependencies

