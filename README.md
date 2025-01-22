# OpenInference

Decentralized inference on the Solana chain.

As a server, you can monetize your hardware by running paid AI inference for users.

As a user, you get access to open AI models without restrictions and for cheaper than on centralized services.

Cheaper because unrestricted competition drives prices down to healthy profit margins.

## How it works

1. Servers publish availability on-chain
2. Clients publish inference requests on-chain, staking maximum desired cost
3. A server locks the inference request on-chain
4. Server streams response to client off-chain
5. Server claims payment on-chain, with remainder returned to client

### 1. Servers publish availability on-chain

Servers publish availability by sending a transaction to a smart contract, including a list of models available for inference (hugging face IDs) and price per token for each.

### 2. Clients publish inference requests on-chain

Clients publish inference requests on chain also by sending a transaction to a smart contract.

They don't send requests directly to servers because the maximum cost must be staked on-chain to ensure payment.

An inference request includes:

- Filtering criteria for server
  - Minimum values for metrics from [reputation system](./docs/reputation-system.md)
  - Minimum total completed inferences
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

## Response streaming

Response streaming means the client can see the response being generated in real time, like with ChatGPT and other popular AI assistants.

Option 1: Simply update the response account on-chain with the latest tokens of the response.

If this is too expensive or for some reason impractical, we need to find an off-chain way of doing response streaming.

Server may support off-chain response streaming perhaps.
But could they just keep updating the same account with more and more content?

## Monetization

We can introduce a fee, such as 10%, on the cost of each inference through the smart contract at some point.

Question: should this be charged from the client's stake in addition to the server's charge, or deducted from the server's charge? Maybe the latter, as servers are the ones profiting so they should be the ones deducting.

## Storage

TODO

Could be IPFS/filecoin or arweave

## Website

Chainference will have a centralized website with:

- List of active servers and their details
- List of models and their details such as pricing and server availability

## Solana facts

- Fees are cheap, with $0.01 being enough for around 8k transactions at the base fee with a SOL value of $250. Prioritization fees are almost negligible at an average of ~1 lamport (1e-9 SOL).
- Storage is expensive, with a cost of ~7 SOL per MB ($1750 at $250 SOL price). This value is however fully recoverable on deletion.

## Anonymity

Prompts and responses are only visible to each client and server engaging in a transaction.

However, anonymity could be enhanced by using disposable accounts to submit prompts with.

To avoid tracing back to the real wallet, a centralized place could be creating these disposable wallets for everyone, perhaps the chainference smart contract itself.

However, servers can still associate prompts to the address they are sending the response to.

So the possibility of users creating temporary addresses to receive responses at should be investigated - some sort of proxying.
