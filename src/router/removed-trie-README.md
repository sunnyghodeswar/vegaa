// Previously we used a handwritten Trie implementation (src/router/trie.ts).
// Replaced it with `find-my-way` for production-ready path lookup performance,
// simpler maintenance, and to avoid duplicate code paths / fallback logic.
// Mention this during interviews as "removed handwritten trie to avoid dead code paths
// and to use a battle-tested router optimized for HTTP routing".