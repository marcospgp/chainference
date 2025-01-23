import { AppShell } from '@mantine/core';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PromptInput } from './components/PromptInput';

import { createAppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'

// 0. Set up Solana Adapter
const solanaWeb3JsAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()]
})

// 1. Get projectId from https://cloud.reown.com
const projectId = 'd299503adc7b475a7b9dffb4e518992b'

// 2. Create a metadata object - optional
const metadata = {
  name: 'chainference',
  description: 'AppKit Example',
  url: 'https://reown.com/appkit', // origin must match your domain & subdomain
  icons: ['https://assets.reown.com/reown-profile-pic.png']
}

// 3. Create modal
createAppKit({
  adapters: [solanaWeb3JsAdapter],
  networks: [solana, solanaTestnet, solanaDevnet],
  metadata: metadata,
  projectId,
  features: {
    analytics: true // Optional - defaults to your Cloud configuration
  }
})

const chatHistory = [
  {
    title: "How do I start a...",
    date: "Apr 24",
    messages: 10
  },
  {
    title: "What's the best way...",
    date: "May 12",
    messages: 2
  },
  {
    title: "How can I lose...",
    date: "Jun 8",
    messages: 4
  },
  {
    title: "What's the secret to...",
    date: "Jul 3",
    messages: 12
  },
  {
    title: "How do I improve my...",
    date: "Jul 14",
    messages: 14
  },
  {
    title: "What's the cheapest...",
    date: "Aug 19",
    messages: 8
  },
  {
    title: "How can I fix my...",
    date: "Sep 5",
    messages: 2
  },
  {
    title: "What's the fastest...",
    date: "Sep 28",
    messages: 1
  }
];

export default function App() {
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm' }}
      bg="dark.9"
    >
      <AppShell.Header bg="dark.8">
        <Header />
      </AppShell.Header>

      <AppShell.Navbar bg="dark.8" p="md">
        <Sidebar chatHistory={chatHistory} />
      </AppShell.Navbar>

      <AppShell.Main flex={1} style={{ display: 'flex', flex: 1, flexDirection: 'column' }} pt="lg">
        <PromptInput />
      </AppShell.Main>
    </AppShell>
  );
} 