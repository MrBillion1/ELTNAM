export interface BridgeParams {
  amount: bigint;
  sourceChain: string;
  destinationToken: string;
  recipient: string;
}

export const LZ_SOLANA_EID = 30168;
export const LZ_MANTLE_EID = 30181;

export async function bridgeViaOFT({ amount, sourceChain, destinationToken, recipient }: BridgeParams) {
  console.log(`[LayerZeroOFT] Initiating transfer of ${amount.toString()} to ${recipient} on Mantle from ${sourceChain}`);

  // Simulates OFT quoteSend and send operations
  const minAmountLD = (amount * 99n) / 100n; // 1% slippage control

  return {
    txHash: '0x9a8f4c2b9a7d8e61f43a2b8c9d0e1f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e',
    estimatedTime: '30-60 seconds',
    minAmountReceived: minAmountLD.toString(),
    destinationToken,
  };
}

export function getSupportedSourceChains(): string[] {
  return ['Ethereum', 'Solana', 'Arbitrum One', 'Base', 'Optimism', 'BNB Smart Chain'];
}
