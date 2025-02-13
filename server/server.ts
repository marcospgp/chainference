import * as anchor from "@coral-xyz/anchor";
import type { Chainference } from "../solana/target/types/chainference";
import nacl from "tweetnacl";

export function startServer(
  port: number,
  chainference: anchor.Program<Chainference>
) {
  Bun.serve({
    development: false,
    port,
    async fetch(req) {
      const url = new URL(req.url);
      const requestAccountAddress = url.pathname.slice(1);

      if (requestAccountAddress === "lalala") {
        return new Response("Bernardo a hoe");
      }

      if (requestAccountAddress === "") {
        return new Response("Not found", { status: 404 });
      }

      const request = await chainference.account.inferenceRequestAccount.fetch(
        requestAccountAddress
      );

      const body = await req.json();

      const signature = body["signature"];

      const isValid = nacl.sign.detached.verify(
        new TextEncoder().encode(requestAccountAddress),
        signature,
        request.requester.toBytes()
      );

      if (!isValid) {
        return new Response(null, { status: 401 });
      }

      const stream = new ReadableStream({
        async pull(controller) {
          for (let i = 0; i < 100; i++) {
            controller.enqueue(new TextEncoder().encode(`${i}, `));
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          controller.enqueue(`done!`);
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        },
        status: 200,
      });
    },
  });

  console.log(`Server running on http://localhost:${port}`);
}
