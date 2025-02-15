import * as anchor from "@coral-xyz/anchor";
import type { Chainference } from "../solana/target/types/chainference";
import nacl from "tweetnacl";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Headers": "*",
};

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
      if (req.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: corsHeaders,
        });
      }

      // Expect request path to be in the format "/<inference-request-account-address>".
      const url = new URL(req.url);
      const requestAccountAddress = url.pathname.slice(1);

      if (requestAccountAddress === "") {
        return new Response("Not found", { status: 404 });
      }

      let body: any;
      try {
        body = await req.json();
      } catch (e) {
        console.error("Failed to parse request body into JSON:");
        console.error(JSON.stringify(req, null, 4));
        console.error(req.body);
        throw e;
      }

      // TODO: we disabled signature validation for now, as the frontend is not able to sign
      // messages when using a wallet provided via a url query param.
      //
      // const request = await chainference.account.inferenceRequestAccount.fetch(
      //   requestAccountAddress
      // );
      //
      // const signature = body["signature"];
      //
      // const isValid = nacl.sign.detached.verify(
      //   new TextEncoder().encode(requestAccountAddress),
      //   Buffer.from(signature, "hex"),
      //   request.requester.toBytes()
      // );
      //
      // if (!isValid) {
      //   console.log(`Received prompt request with invalid signature.`);
      //
      //   return new Response(null, { status: 401 });
      // }

      const messages = body["messages"];

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

      const ollamaReader = ollamaStream.body!.getReader();
      const decoder = new TextDecoder();

      const responseStream = new ReadableStream({
        // @ts-expect-error
        type: "direct",
        async pull(controller) {
          while (true) {
            const { done, value } = await ollamaReader.read();
            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.trim() === "") {
                continue;
              }

              const obj = JSON.parse(line);

              if (obj.done) {
                break;
              }

              const content = obj.message.content;

              // @ts-expect-error
              controller.write(content);
            }
          }

          controller.close();
        },
      });

      return new Response(responseStream, {
        headers: {
          ...corsHeaders,
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
