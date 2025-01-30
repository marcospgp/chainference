import { useState, useEffect } from 'react';
import type { Connection } from '@solana/web3.js';
import type { PublicKey } from '@solana/web3.js';

const useSolanaProgramListener = (
  programId: PublicKey,
  connection: Connection
) => {
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    const subscriptionId = connection.onProgramAccountChange(
      programId,
      (info) => {
        console.log(info);
        setState(info);
      }
    );

    return () => {
      connection.removeProgramAccountChangeListener(subscriptionId);
    };
  }, [programId, connection]);

  return state;
};

export default useSolanaProgramListener;
