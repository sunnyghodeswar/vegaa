# Architecture Diagrams

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Vegaa Framework                          │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    Public API Layer                     │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │  vegaa   │  │  route() │  │ plugins  │           │  │
│  │  └──────────┘  └──────────┘  └──────────┘           │  │
│  └────────────────────────────────────────────────────────┘  │
│                            │                                   │
│                            ▼                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   Core Application                      │  │
│  │  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │ Route        │  │ Middleware   │                  │  │
│  │  │ Management   │  │ Pipeline     │                  │  │
│  │  └──────────────┘  └──────────────┘                  │  │
│  │  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │ Context      │  │ Error        │                  │  │
│  │  │ Injection    │  │ Handling     │                  │  │
│  │  └──────────────┘  └──────────────┘                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                            │                                   │
│        ┌───────────────────┼───────────────────┐             │
│        ▼                   ▼                   ▼             │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐           │
│  │ Router   │      │ Plugins  │      │ Utils    │           │
│  │ (find-my│      │ System   │      │ (cache,  │           │
│  │  -way)  │      │          │      │  params) │           │
│  └──────────┘      └──────────┘      └──────────┘           │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  Node.js HTTP │
                    │     Server    │
                    └───────────────┘
```

## Component Interaction

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP Request
       ▼
┌─────────────────────────────────────┐
│         Vegaa Application           │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ 1. buildContext()             │ │
│  │    - Parse URL                │ │
│  │    - Extract query            │ │
│  │    - Create Context           │ │
│  └───────────────┬───────────────┘ │
│                  ▼                  │
│  ┌───────────────────────────────┐ │
│  │ 2. Global Middleware          │ │
│  │    - Execute in sequence      │ │
│  │    - Inject values            │ │
│  └───────────────┬───────────────┘ │
│                  ▼                  │
│  ┌───────────────────────────────┐ │
│  │ 3. Route Matching             │ │
│  │    - find-my-way              │ │
│  │    - Extract params           │ │
│  └───────────────┬───────────────┘ │
│                  ▼                  │
│  ┌───────────────────────────────┐ │
│  │ 4. Route Middleware           │ │
│  │    - Route-specific           │ │
│  └───────────────┬───────────────┘ │
│                  ▼                  │
│  ┌───────────────────────────────┐ │
│  │ 5. Handler Execution          │ │
│  │    - Parameter injection      │ │
│  │    - Call handler             │ │
│  └───────────────┬───────────────┘ │
│                  ▼                  │
│  ┌───────────────────────────────┐ │
│  │ 6. Response                  │ │
│  │    - JSON/HTML/Text/File      │ │
│  └───────────────┬───────────────┘ │
└───────────────────┼─────────────────┘
                    │
                    ▼
            ┌───────────────┐
            │ HTTP Response │
            └───────────────┘
```

## Plugin System Architecture

```
┌─────────────────────────────────────────┐
│          Plugin Registration            │
│                                         │
│  vegaa.plugin(plugin, options)         │
└───────────────┬─────────────────────────┘
                │
                ▼
        ┌───────────────┐
        │ Plugin Check  │
        │ isPlugin()    │
        └───────┬───────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
  Valid Plugin    Invalid Plugin
        │               │
        │               └──▶ Error
        │
        ▼
┌───────────────┐
│ Register      │
│ plugin.register│
│ (app, opts)   │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Plugin can:   │
│ - Add middleware│
│ - Decorate app │
│ - Add hooks    │
└───────────────┘
```

## Middleware Pipeline

```
Request Context
      │
      ▼
┌─────────────┐
│ Middleware1 │───▶ Adds: { user }
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Middleware2 │───▶ Receives: user
│             │    Adds: { greeting }
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Middleware3 │───▶ Receives: user, greeting
│             │    Adds: { log }
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Handler   │───▶ Receives: user, greeting, log
│             │    Returns: response
└──────┬──────┘
       │
       ▼
   Response
```

## Context Injection Flow

```
Handler Function Signature:
  (id, user, body) => { ... }

         │
         ▼
┌────────────────────┐
│ Extract Parameters │
│ ['id', 'user',     │
│  'body']           │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Build Context      │
│ ctx = {            │
│   id: '123',       │
│   user: {...},     │
│   body: {...}      │
│ }                  │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Compile Arguments  │
│ [ctx['id'],        │
│  ctx['user'],      │
│  ctx['body']]      │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Call Handler       │
│ handler(...args)   │
└────────────────────┘
```

## Router Architecture

```
┌─────────────────────────────────────┐
│         Route Registration          │
│                                     │
│  route('/users/:id').get(handler)  │
└───────────────┬─────────────────────┘
                │
                ▼
        ┌───────────────┐
        │ RouteBuilder  │
        │ - path        │
        │ - middleware  │
        │ - handler     │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ App.register  │
        │ Route()       │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Router Map    │
        │ Map<Method,   │
        │  Router>      │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ find-my-way   │
        │ Router        │
        └───────────────┘
```

## Cluster Mode Architecture

```
┌─────────────────────────────────────┐
│         Master Process              │
│                                     │
│  - Fork workers (CPU count)        │
│  - Manage worker lifecycle          │
│  - Handle worker restarts           │
└───────────┬─────────────────────────┘
            │
    ┌───────┼───────┐
    │       │       │
    ▼       ▼       ▼
┌──────┐ ┌──────┐ ┌──────┐
│Worker│ │Worker│ │Worker│
│  1   │ │  2   │ │  N   │
└──────┘ └──────┘ └──────┘
    │       │       │
    └───────┼───────┘
            │
            ▼
    ┌───────────────┐
    │ Shared Port   │
    │ (VEGAA_PORT)  │
    └───────────────┘
```

