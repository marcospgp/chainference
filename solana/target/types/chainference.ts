/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/chainference.json`.
 */
export type Chainference = {
  "address": "7Gz2FThJQ3bqJsub9MLcZrbktub2HmyWksYSX2z8WQgH",
  "metadata": {
    "name": "chainference",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addServer",
      "discriminator": [
        163,
        250,
        178,
        94,
        187,
        232,
        249,
        120
      ],
      "accounts": [
        {
          "name": "serverAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  114,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "models",
          "type": {
            "vec": {
              "defined": {
                "name": "modelListing"
              }
            }
          }
        }
      ]
    },
    {
      "name": "claimPayment",
      "discriminator": [
        69,
        112,
        250,
        167,
        37,
        156,
        200,
        30
      ],
      "accounts": [
        {
          "name": "request",
          "writable": true
        },
        {
          "name": "serverOwner",
          "writable": true,
          "signer": true
        },
        {
          "name": "requester",
          "writable": true,
          "relations": [
            "request"
          ]
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "closeServer",
      "discriminator": [
        98,
        52,
        145,
        25,
        123,
        111,
        167,
        40
      ],
      "accounts": [
        {
          "name": "serverAccount",
          "writable": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "serverAccount"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "lockRequest",
      "discriminator": [
        106,
        194,
        219,
        255,
        101,
        59,
        94,
        128
      ],
      "accounts": [
        {
          "name": "request",
          "writable": true
        },
        {
          "name": "server",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "server"
          ]
        }
      ],
      "args": [
        {
          "name": "sendPromptTo",
          "type": "string"
        }
      ]
    },
    {
      "name": "requestInference",
      "discriminator": [
        92,
        72,
        143,
        109,
        60,
        207,
        61,
        135
      ],
      "accounts": [
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "request",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  113,
                  117,
                  101,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "requester"
              }
            ]
          }
        },
        {
          "name": "requester",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "model",
          "type": "string"
        },
        {
          "name": "maxCost",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "inferenceRequestAccount",
      "discriminator": [
        54,
        158,
        20,
        178,
        188,
        23,
        90,
        100
      ]
    },
    {
      "name": "serverAccount",
      "discriminator": [
        217,
        98,
        62,
        130,
        20,
        150,
        79,
        126
      ]
    }
  ],
  "types": [
    {
      "name": "inferenceRequestAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "requester",
            "type": "pubkey"
          },
          {
            "name": "model",
            "type": "string"
          },
          {
            "name": "maxCost",
            "type": "u64"
          },
          {
            "name": "lockedBy",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "sendPromptTo",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "modelListing",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "string"
          },
          {
            "name": "price",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "serverAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "models",
            "type": {
              "vec": {
                "defined": {
                  "name": "modelListing"
                }
              }
            }
          },
          {
            "name": "lastHeartbeat",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
