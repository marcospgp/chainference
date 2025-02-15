import { useState, useEffect, useRef } from "react";
import type { Program } from "@coral-xyz/anchor";
import type { Chainference } from "../../../solana/target/types/chainference";
import {
  decodeAccount,
  fetchInitialAccounts,
  type DecodedAccount,
} from "../chainference";
import { PublicKey } from "@solana/web3.js";

interface AccountWithPubkey {
  pubkey: PublicKey;
  type: DecodedAccount["type"];
  data: DecodedAccount["data"];
}

const useSolanaProgramListener = (program: Program<Chainference>) => {
  const [state, setState] = useState<AccountWithPubkey[]>([]);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isMounted = useRef(false);
  const accountListenersRef = useRef<number[]>([]);

  useEffect(() => {
    isMounted.current = true;
    const walletPublicKey = program.provider.publicKey;

    // Helper function to set up individual account listeners
    const setupAccountListener = (accountPubkey: PublicKey) => {
      const listenerId = program.provider.connection.onAccountChange(
        accountPubkey,
        async (accountInfo) => {
          if (accountInfo.lamports === 0) {
            setState((prevState) => {
              // Remove the closed account by its pubkey
              return prevState.filter(
                (account) => !account.pubkey.equals(accountPubkey)
              );
            });
          } else {
            try {
              // Try to decode the updated account
              const decoded = await decodeAccount(
                program,
                accountInfo.data,
                walletPublicKey
              );
              if (decoded) {
                setState((prevState) => {
                  // Remove any existing account with the same pubkey
                  const filteredState = prevState.filter(
                    (account) => !account.pubkey.equals(accountPubkey)
                  );
                  return [
                    ...filteredState,
                    { ...decoded, pubkey: accountPubkey },
                  ];
                });
              }
            } catch (error) {
              console.error("Failed to decode updated account:", error);
            }
          }
        }
      );
      accountListenersRef.current.push(listenerId);
      return listenerId;
    };

    // Initial fetch with a small delay to prevent rate limiting on mount
    const loadInitialAccounts = async () => {
      try {
        const accounts = await fetchInitialAccounts(program);
        if (isMounted.current) {
          // Get all program accounts to get their pubkeys
          const programAccounts = await program.account.serverAccount.all();
          const inferenceAccounts =
            await program.account.inferenceRequestAccount.all();

          // Create a map of account data to pubkey
          const pubkeyMap = new Map();
          programAccounts.forEach((acc) => {
            pubkeyMap.set(acc.account.owner.toBase58(), acc.publicKey);
          });
          inferenceAccounts.forEach((acc) => {
            pubkeyMap.set(acc.account.requester.toBase58(), acc.publicKey);
          });

          // Add pubkeys to the accounts
          const accountsWithPubkeys = accounts.map((account) => {
            const key =
              account.type === "serverAccount"
                ? account.data.owner.toBase58()
                : account.data.requester.toBase58();
            const pubkey = pubkeyMap.get(key);
            if (pubkey) {
              setupAccountListener(pubkey);
            }
            return { ...account, pubkey };
          });

          setState(accountsWithPubkeys);
        }
      } catch (error: any) {
        console.error("Failed to fetch initial accounts:", error);
        if (error.message?.includes("429")) {
          if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
          fetchTimeoutRef.current = setTimeout(loadInitialAccounts, 5000);
        }
      }
    };

    fetchTimeoutRef.current = setTimeout(loadInitialAccounts, 1000);

    // Listen for new accounts
    const programSubscriptionId =
      program.provider.connection.onProgramAccountChange(
        program.programId,
        async (info) => {
          try {
            const decoded = await decodeAccount(
              program,
              info.accountInfo.data,
              walletPublicKey
            );
            if (decoded) {
              const accountPubkey = info.accountId;
              setupAccountListener(accountPubkey);

              setState((prevState) => {
                const filteredState = prevState.filter(
                  (account) => !account.pubkey.equals(accountPubkey)
                );
                return [
                  ...filteredState,
                  { ...decoded, pubkey: accountPubkey },
                ];
              });
            }
          } catch (error) {
            console.error("Failed to decode program account:", error);
          }
        }
      );

    return () => {
      isMounted.current = false;
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      // Clean up all account listeners
      accountListenersRef.current.forEach((listenerId) => {
        program.provider.connection.removeAccountChangeListener(listenerId);
      });
      accountListenersRef.current = [];
      // Clean up program listener
      program.provider.connection.removeProgramAccountChangeListener(
        programSubscriptionId
      );
    };
  }, [program]);

  // Return just the DecodedAccount part without the pubkey
  return state.map(({ pubkey, ...account }) => account);
};

export default useSolanaProgramListener;
