# Message Model & Branching

## Core Concept: Node Pool

Messages are stored in a **flat Map**, not a nested tree. Each message knows its parent and children:

```typescript
MessageNode {
  id: string
  parentId: string | null    // null for root
  childIds: string[]         // ordered list of children
  role: 'user' | 'assistant' | 'system'
  content: string
  // ... metadata
}

Chat {
  nodes: Map<string, MessageNode>   // All messages in this chat
  activeBranches: Map<string, number>  // Which child is "active" at each node
  rootNodeId: string
}
```

## Why Node Pool Over Tree?

1. **O(1) message lookup** - Direct access by ID without traversal
2. **Easy serialization** - Map → Array → JSON, no recursion needed
3. **Simple updates** - Modify one node without rebuilding tree structure
4. **Branch switching** - Just update `activeBranches` map, no node moves

## Branching Model

When user regenerates or edits, we create a **sibling branch**, not a replacement:

```
         [user msg A]
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
[asst v1] [asst v2] [asst v3]   ← childIds: ['v1', 'v2', 'v3']
              ↑
        activeBranch = 1        ← index into childIds
```

The `activeBranches` map tracks which branch is "current" at each fork point.

## Getting Visible Messages

To display a conversation, walk from root following active branches:

```
1. Start at rootNodeId
2. Add node to result
3. Look up activeBranches[nodeId] → child index
4. Get childIds[index] → next node
5. Repeat until no more children
```

This gives linear conversation path through the branching structure.

## Common Operations

| Operation | What happens |
|-----------|--------------|
| **Add message** | Create node, append ID to parent's childIds |
| **Edit message** | Update node content in place |
| **Regenerate** | Create new sibling node, switch active branch to it |
| **Switch branch** | Update activeBranches[parentId] to new index |
| **Delete branch** | Remove node ID from parent's childIds, clean up descendants |

## Branch Navigation UI

Components show branch controls when a node has multiple children:

```
← 2/3 →   (showing branch 2 of 3 alternatives)
```

Clicking arrows updates `activeBranches` for that node, triggering reactive re-render of visible messages.
