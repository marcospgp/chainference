# Reputation system

_Note: This reputation system draft is meant to be adapted as it interfaces with and receives feedback from the real world._

The main problem with decentralized inference is we can't trust servers to run the models they claim to, or to run models at all. Left unchecked, they could spam lower-effort responses and collect payments.

This is countered by a reputation system where the following metrics are tracked for each server:

- success ratio
- preference ratio

## Success ratio

If a response is obviously bad or missing entirely, users can flag it, affecting the server's success ratio.
A response is counted as successful by default unless the user flags it.

## Preference ratio

Preference ratio comes from an app feature: users can run two inferences at the same time and with the same prompt, obtaining responses from two different servers. They can then choose which response they prefer.

This addresses the issue of judging finer model quality, verifying that servers are running the models they claim to be.

Without a point of comparison, it can be hard to judge whether a response matches the level of quality expected from the model that created it.

We can't rely on deterministic checks because even with the same random seed, small differences in hardware floating point operations can result in different outputs, especially as the differences accumulate.

A compliant server should be able to maintain a track record of being preferred by users 50% of the time.

### Implementation

Servers can't know they're going to be compared for a given request - they could easily hide malicious behavior if so.

Users thus submit a comparison transaction **after** the fact, which:

- increments each server's comparison counter
- increments the preferred server's "preferred" counter

## How do we avoid malicious user feedback

Users running a server may want to falsely lower the reputation of competing servers, by:

- falsely flagging responses
- submitting false comparisons preferring their own servers over competitors

The incentive for this is weak from the start simply because each transaction costs money.

The more solid a server's reputation, the more expensive it would be to affect it. However, this means younger servers may be more vulnerable to this kind of attack.

This could be circumvented by allowing servers to retract flagged responses in exchange for returning the payment. This however introduces strong incentives for:

- malicious users to flag every response, in the chance it is made free of charge
- malicious servers to retract every flagged response, in order to maintain an undeserved pristine reputation

Circumventing the first bad incentive by allowing servers to blacklist users would only strengthen the second, so it is not a good idea.

Thankfully, we may be able to circumvent this altogether: because only younger servers with weaker reputations are vulnerable to false flag attacks, these can be defended by simply restarting the server with a new account.

It would be expensive to keep incumbent servers at bay simply because they can start over indefinitely.

### Weighting feedback

We could also consider weighting feedback by account balance at some point, but this seems like overengineering.

## How do we avoid users being charged for bad responses?

For now we don't.

Because each transaction should be small, and servers have to retrieve payment explicitly by claiming they have submitted a successful response, avoiding users being charged for bad responses may not be a relevant enough issue to address.

Users can rely on reputation system metrics to avoid malicious servers, at least for the most part
