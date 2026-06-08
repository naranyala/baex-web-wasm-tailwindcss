# API Doc Gen

A lightweight, Doxygen-inspired API documentation generator that produces a single-file HTML report.

## Features

- Scans `.ts` (TypeScript) and `.rs` (Rust) files.
- Parses doc-comments (`///` for Rust, `/** ... */` for TypeScript).
- Supports `@param`, `@returns`, and `@example` tags.
- Generates a searchable, single-file HTML report with a sidebar navigation.

## Usage

Generate the documentation:
```bash
bun run docs:gen
```

Serve the documentation locally:
```bash
bun run docs:serve
```

The documentation will be generated as `api-docs.html` in the project root.

## Documentation Format

### Rust
Use `///` comments above functions, structs, or constants.

```rust
/// Adds two numbers.
/// @param a The first number
/// @param b The second number
/// @returns The sum of a and b
/// @example
/// let result = add(1, 2);
fn add(a: i32, b: i32) -> i32 { a + b }
```

### TypeScript
Use `/** ... */` comments above functions, classes, or variables.

```typescript
/**
 * Calculates the area of a circle.
 * @param radius The radius of the circle
 * @returns The area
 * @example
 * const area = calculateArea(5);
 */
function calculateArea(radius: number): number {
    return Math.PI * radius * radius;
}
```
