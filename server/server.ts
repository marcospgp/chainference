import * as anchor from "@coral-xyz/anchor";
import type { Chainference } from "../solana/target/types/chainference";
import nacl from "tweetnacl";

export function startServer(
  port: number,
  chainference: anchor.Program<Chainference>,
  model: string,
  price: string
) {
  Bun.serve({
    development: false,
    port,
    async fetch(req) {
      // Expect request path to be in the format "/<inference-request-account-address>".
      const url = new URL(req.url);
      const requestAccountAddress = url.pathname.slice(1);

      if (requestAccountAddress === "") {
        return new Response("Not found", { status: 404 });
      }

      const request = await chainference.account.inferenceRequestAccount.fetch(
        requestAccountAddress
      );

      const body = await req.json();

      const signature = body["signature"];
      const messages = body["messages"];

      const isValid = nacl.sign.detached.verify(
        new TextEncoder().encode(requestAccountAddress),
        Buffer.from(signature, "hex"),
        request.requester.toBytes()
      );

      if (!isValid) {
        console.log(`Received prompt request with invalid signature.`);

        return new Response(null, { status: 401 });
      }

      console.log(
        `Received prompt request with valid signature. Sending response...`
      );

      const ollamaStream = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
        }),
      });

      if (!ollamaStream.ok) {
        throw new Error(ollamaStream.statusText);
      }

      const reader = ollamaStream.body!.getReader();
      const decoder = new TextDecoder();

      const responseStream = new ReadableStream({
        async pull(controller) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(chunk);
          }
        },
      });

      return new Response(responseStream, {
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
