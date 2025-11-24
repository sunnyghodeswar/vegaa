# Vegaa Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Vegaa Framework                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Public API │───▶│  Core App   │───▶│   Router     │  │
│  │  (index.ts)  │    │  (app.ts)   │    │  (adapter)   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         │                    ▼                    │          │
│         │         ┌──────────────────┐           │          │
│         │         │  Middleware      │           │          │
│         │         │  System          │           │          │
│         │         └──────────────────┘           │          │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Plugins    │    │   Utils      │    │   Context    │  │
│  │  (cors, json)│    │  (params,    │    │   Builder    │  │
│  │              │    │   cache)     │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Node.js HTTP │
                    │     Server    │
                    └───────────────┘
```

## Core Components

### 1. Public API Layer (`src/index.ts`)
- **Purpose**: Single entry point for framework users
- **Exports**: `vegaa`, `route()`, plugins, response helpers
- **Design**: Global singleton pattern

### 2. Core Application (`src/core/app.ts`)
- **Purpose**: Main application class managing routes, middleware, and request handling
- **Key Features**:
  - Route registration and dispatch
  - Middleware execution pipeline
  - Context injection system
  - Error handling
  - Cluster mode support

### 3. Router (`src/router/`)
- **Purpose**: Fast route matching and parameter extraction
- **Implementation**: Uses `find-my-way` for high-performance routing
- **Features**: Path parameters, query strings, method matching

### 4. Middleware System (`src/core/app.ts`)
- **Purpose**: Request processing pipeline
- **Types**: Global and route-specific middleware
- **Features**: Context injection, async support, error propagation

### 5. Plugin System (`src/core/plugins.ts`)
- **Purpose**: Extensible architecture for adding functionality
- **Built-in Plugins**: CORS, JSON parser, Body parser, Static files, HTTP client
- **API**: `vegaa.plugin(plugin, options)`

### 6. Utilities (`src/utils/`)
- **Context Builder**: Creates request context
- **Parameter Extraction**: Parses function parameters for injection
- **Cache**: In-memory caching with TTL
- **Semaphore**: Concurrency control
- **Response Helpers**: HTML, text, file responses

## Request Flow

```
1. HTTP Request
   │
   ▼
2. buildContext() ──▶ Creates Context object
   │
   ▼
3. Global Middleware ──▶ Executes in sequence
   │
   ▼
4. Route Matching ──▶ find-my-way router
   │
   ▼
5. Route Middleware ──▶ Route-specific middleware
   │
   ▼
6. Handler Execution ──▶ Parameter injection
   │
   ▼
7. Response ──▶ JSON/HTML/Text/File
```

## Design Principles

1. **Minimalism**: Zero boilerplate, clean API
2. **Performance**: Fast routing, minimal overhead
3. **Type Safety**: Full TypeScript support
4. **Extensibility**: Plugin system for customization
5. **Developer Experience**: Smart parameter injection, context awareness

## Technology Stack

- **Runtime**: Node.js 18+
- **Router**: `find-my-way` (fast HTTP router)
- **JSON**: `fast-json-stringify` (optimized serialization)
- **HTTP Client**: `undici` (high-performance requests)
- **Language**: TypeScript with ESM and CJS support

