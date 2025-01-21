# Chainference

Decentralized inference on the Solana chain.

As a server, you can monetize your hardware's downtime by running paid AI inference for users.

As a user, you can interact with open AI models without restrictions and for cheaper than on centralized services.

Because it is a free market, prices are driven down to healthy but non-predatory profit margins.

## How it works

1. Servers publish availability on the chain by sending a transaction to a chainference smart contract, including:
   - Models available for inference (hugging face IDs for now?) and price per token for each
   - Public key for the user to encrypt the prompt with (see [privacy](#privacy))
1. Client publishes inference request on chain (smart contract?) including:
   - [Filtering criteria for server](#filtering-criteria)
   - Prompt
   - Desired model
   - SOL stake of maximum cost
   - Maximum time for inference (time after which the stake is returned to the client if the server that locked the request has not yet posted a response) (maybe hide for now and default to 5 minutes?)
   - List of accounts of desired servers (the only ones allowed to lock down the request)
1. A server included in the desired servers list for a request sees it, locks it down, and when the locking is successful begins inference.
1. Server creates response account on-chain with first token, then updates it with more data as it becomes available.
1. When inference is finished, server claims the cost of inference and the remainder is returned to the client's account.

## Reputation system

Malicious behavior is disincentivized through a [reputation system](./docs/reputation-system.md).

## Filtering criteria

- Minimum values for metrics from [reputation system](./docs/reputation-system.md)
- Minimum total completed inferences

## Response streaming

Response streaming means the client can see the response being generated in real time, like with ChatGPT and other popular AI assistants.

Option 1: Simply update the response account on-chain with the latest tokens of the response.

If this is too expensive or for some reason impractical, we need to find an off-chain way of doing response streaming.

Server may support off-chain response streaming perhaps.
But could they just keep updating the same account with more and more content?

## Privacy

Prompt and response data stored on-chain is encrypted.

Servers send a unique public key to each client that it can use to encrypt prompts.

Conversely, clients send a unique public key to each server that it can use to encrypt responses.

This way, only the client and server that participate in an inference transaction are able to see the prompt and response.

For clients to be able to decrypt their past prompts based on chain data alone, they also store the server-provided public keys alongside the prompt, except first encrypting them with their private key.

## Monetization

Introduce a 10% fee on the cost of each inference.

Question: should this be charged from the client's stake in addition to the server's charge, or deducted from the server's charge? Maybe the latter, as servers are the ones profiting so they should be the ones deducting.

## TODO:

- where to store data (prompts and responses)
