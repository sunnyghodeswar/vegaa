# Request Lifecycle

## Complete Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      HTTP Request Arrives                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  buildContext()       │
                │  - Parse URL          │
                │  - Extract query      │
                │  - Create Context     │
                └───────────┬───────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  onRequest Hooks      │
                │  (if registered)      │
                └───────────┬───────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │     Global Middleware Pipeline         │
        │  ┌─────────────────────────────────┐  │
        │  │ middleware1()                   │  │
        │  │   ↓                             │  │
        │  │ middleware2()                   │  │
        │  │   ↓                             │  │
        │  │ middlewareN()                   │  │
        │  └─────────────────────────────────┘  │
        └───────────┬───────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   Route Matching      │
        │   find-my-way         │
        │   Extract params      │
        └───────────┬───────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
   Route Found?           404 Not Found
        │                       │
        │                       └──▶ Send 404 Response
        │
        ▼
┌───────────────────────┐
│  Smart Injection      │
│  - GET/DELETE:        │
│    Flatten params     │
│  - POST/PUT:          │
│    Group params       │
│    Flatten body       │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Route Middleware      │
│ (if any)             │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ Handler Execution     │
│ - Extract params      │
│ - Build arguments     │
│ - Call handler        │
│ - Get response        │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  onResponse Hooks     │
│  (if registered)      │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  Response Handling    │
│  - Check type         │
│  - HTML/Text/File?    │
│  - JSON (default)     │
│  - Serialize         │
└───────────┬───────────┘
            │
            ▼
    ┌───────────────┐
    │ Send Response │
    └───────────────┘
```

## Error Handling Flow

```
                    Error Occurs
                         │
                         ▼
            ┌──────────────────────┐
            │  Catch Error         │
            └──────────┬────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌───────────────┐           ┌───────────────┐
│ onError Hooks │           │ Error Handler  │
│ (if any)      │           │ (if any)      │
└───────┬───────┘           └───────┬───────┘
        │                             │
        └──────────────┬──────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │  Send Error Response │
            │  Status: 500         │
            │  JSON: {error: ...}  │
            └──────────────────────┘
```

## Context Injection Process

### Step 1: Parameter Extraction
```typescript
// Handler function
route('/users/:id').get((id, user) => { ... })

// Vegaa extracts: ['id', 'user']
```

### Step 2: Context Building
```typescript
// Context object created
ctx = {
  params: { id: '123' },
  user: { id: 1, name: 'John' },
  // ... other properties
}
```

### Step 3: Argument Building
```typescript
// Compiled function builds arguments
args = [ctx['id'], ctx['user']]
// Result: ['123', { id: 1, name: 'John' }]
```

### Step 4: Handler Execution
```typescript
// Handler called with injected arguments
handler(...args)
```

## Middleware Execution

### Global Middleware
```typescript
vegaa.middleware(async () => ({ user: { id: 1 } }))
vegaa.middleware(async (user) => ({ greeting: `Hello ${user.name}` }))

// Execution order:
// 1. middleware1() → adds { user }
// 2. middleware2(user) → adds { greeting }
// 3. Handler receives: (user, greeting)
```

### Route Middleware
```typescript
route('/admin')
  .middleware(() => ({ role: 'admin' }))
  .get((role) => { ... })

// Execution order:
// 1. Global middleware
// 2. Route middleware → adds { role }
// 3. Handler receives: (role, ...globalValues)
```

## Response Types

### JSON (Default)
```typescript
route('/api').get(() => ({ data: 'value' }))
// → Content-Type: application/json
```

### HTML
```typescript
route('/').get(() => html('<h1>Hello</h1>'))
// → Content-Type: text/html
```

### Text
```typescript
route('/status').get(() => text('OK'))
// → Content-Type: text/plain
```

### File (via Static Plugin)
```typescript
route('/file').get(() => file('./public/index.html'))
// → Served by static plugin
```

