# Chainference

Decentralized inference on the Solana chain.

As a server, you can monetize your hardware by running paid AI inference for users.

As a user, you get access to open AI models without restrictions and for cheaper than on centralized services.

Cheaper because unrestricted competition drives prices down to healthy profit margins.

## Getting started

See each subfolder's readme for instructions on the different parts of the project.

## How it works

1. [Servers publish availability on-chain](#1-servers-publish-availability-on-chain)
2. [Clients publish inference requests on-chain, staking maximum desired cost](#2-clients-publish-inference-requests-on-chain)
3. [A server locks the inference request on-chain](#3-a-server-locks-the-inference-request-on-chain)
4. [Client sends prompt to server off-chain](#4-client-sends-prompt-to-server-off-chain)
5. [Server streams response to client off-chain](#5-server-streams-response-to-client-off-chain)
6. [Server claims payment on-chain, with remainder returned to client](#6-server-claims-payment-on-chain)

### 1. Servers publish availability on-chain

Servers publish availability by sending a transaction to a smart contract, including a list of models available for inference (hugging face IDs) and price per million output tokens for each.

### 2. Clients publish inference requests on-chain

Clients publish inference requests on chain also by sending a transaction to a smart contract.

They don't send requests directly to servers because the maximum cost must be staked on-chain to ensure payment.

An inference request includes:

- Filtering criteria for server
  - Minimum values for metrics from [reputation system](./docs/reputation-system.md)
  - Minimum total completed inferences
- Desired model
- SOL stake of maximum cost
- Creation timestamp

### 3. A server locks the inference request on-chain

Servers lock inference requests, once again, by sending a transaction to a smart contract.

This transaction includes the peer to peer address the client should send the prompt to.

### 4. Client sends prompt to server off-chain

The client then sends the prompt to the provided peer to peer address.

This should be encrypted - there may be encryption built into the peer to peer library or protocol we end up using, otherwise we may have client and server sharing public keys during the request submitting and request locking process.

### 5. Server streams response to client off-chain

After receiving the prompt, the server streams the response to the peer to peer address previously provided by the client.

This response, similarly to the prompt, should also be encrypted.

### 6. Server claims payment on-chain

When a server finishes responding to an inference request, it can charge the corresponding cost from the amount previously staked by the client, again by submitting a transaction to a smart contract.

After locking an inference request, servers have a 1 hour limit to claim payment. If they don't, the request is cancelled and the stake is fully returned to the user.

This should be a rare case, as there is no incentive for servers to not claim payment on a request, malicious or not.

This limit does handle the case where a benevolent server fails to respond to a request. The server may still get flagged by the client regardless, and likely before this time limit is reached, affecting its reputation.

## Reputation system

Malicious behavior is disincentivized through a [reputation system](./docs/reputation-system.md).

## Monetization

We can introduce a fee (maybe around 10%) on the cost of each inference through the smart contract at some point in the future.

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

## Thoughts on privacy

### Anonymity

Prompts and responses are only visible to each client and server engaging in a transaction.

However, anonymity could be enhanced by using disposable accounts to submit prompts with.

To avoid tracing back to the real wallet, a centralized place could be creating these disposable wallets for everyone, perhaps the chainference smart contract itself.

However, servers can still associate prompts to the address they are sending the response to.

So the possibility of users creating temporary addresses to receive responses at should be investigated - some sort of proxying.

### Encryption

Future improvements in encrypted inference may allow us to have servers running inference on prompts without being able to see its plain text contents, and perhaps also for the response.
