# Server

Bun CLI for running a Chainference server.

## Dependencies

[Bun](https://bun.sh/).

## Setup

- Run `bun install`
- Place `wallet.json` in project folder if you have one

## Run

Run with `bun index.ts`.

## Running a server locally

You can expose a local server to the internet through [Cloudflare tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/).

To avoid starting `cloudflared` on OS boot, run `sudo cloudflared service uninstall` after installing.

To start the service manually, use `cloudflared tunnel run <TUNNEL-NAME>`.
