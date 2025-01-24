# Chainference

Decentralized inference on the Solana chain.

As a server, you can monetize your hardware by running paid AI inference for users.

As a user, you get access to open AI models without restrictions and for cheaper than on centralized services.

Cheaper because unrestricted competition drives prices down to healthy profit margins.

[Read more about how it works here](./docs/how-it-works.md).

[UI mockup in Figma](https://www.figma.com/design/ETdGpFo1859B8otLt4J8GH/chainference?node-id=8-2&t=12OrDJfxmJm9XZ8q-1)

## Setup

1. Install [bun](https://bun.sh/)
1. `bun install`
1. `bun run dev`

We set `NODE_ENV` to `development` while developing as React's strict mode relies on this variable.

## CSS

We use [Mantine](https://mantine.dev/) as a UI library.

We have a global CSS file that defines custom variables, and each component's `.module.css` relies only on these for styling consistency.
