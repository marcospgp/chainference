# Server

Bun CLI for running a Chainference server.

## Dependencies

[Bun](https://bun.sh/).

## Setup

- Run `bun install`
- Place `wallet.json` in project folder if you have one

## Run

Run with `bun index.ts`.

## Exposing a local server to the internet

You can expose a local server to the internet through [Cloudflare tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/).

You should avoid installing the `cloudflared` service as it will start automatically OS boot, impacting (even if minimally) CPU usage.

You can either create a [tunnel entirely using the CLI](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/) or still create a tunnel in the cloudflare web UI, but instead of installing the `cloudflared` service, run the following commands:

```sh
cloudflared tunnel login
cloudflared tunnel run --token $(cloudflared tunnel token <tunnel-name>) <tunnel-name>
```
