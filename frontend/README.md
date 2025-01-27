# Frontend

The browser client which allows users to prompt models on the chain.

[UI mockup in Figma](https://www.figma.com/design/ETdGpFo1859B8otLt4J8GH/chainference?node-id=8-2&t=12OrDJfxmJm9XZ8q-1)

## Setup

1. Install [bun](https://bun.sh/)
1. `bun install`
1. `bun run dev`

`NODE_ENV` is set to `development` while developing as React's strict mode relies on it.

## Styling

We use [Mantine](https://mantine.dev/) as a UI library.

We have a global CSS file that defines variables which components rely on for styling consistency.
