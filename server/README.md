# Server

Bun CLI for running a Chainference server.

## Dependencies

[Bun](https://bun.sh/).

## Setup

1. Run `bun install`;
2. Place `wallet.json` in project folder if you have one.

## Run

Run the server with `bun index.ts`.

Run the test client with `bun test-client.ts`.

## Exposing a local server to the internet

You can expose a local server to the internet through [Cloudflare tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/).

You should avoid installing the `cloudflared` service as it will start automatically OS boot, impacting (even if minimally) CPU usage.

You can either create a [tunnel entirely using the CLI](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/) or still create a tunnel in the cloudflare web UI, but instead of installing the `cloudflared` service, run the following commands:

```sh
# This only has to be run once to create a certificate file locally.
cloudflared tunnel login

# This can be run any time to start the cloudflare tunnel.
# Replace <tunnel-name> with the actual name.
TUNNEL_NAME=<tunnel-name> cloudflared tunnel run --token $(cloudflared tunnel token $TUNNEL_NAME) $TUNNEL_NAME
```
