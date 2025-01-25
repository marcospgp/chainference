import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

import '@mantine/core/styles.css';
import './index.css';
import Navbar from './components/Navbar/Navbar';
import Chat from './components/Chat/Chat';
import ChatHistory from './components/ChatHistory/ChatHistory';

const App = () => {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <MantineProvider theme={createTheme({})} defaultColorScheme='dark'>
      <Navbar onMenuClick={open} />
      <div className='main'>
        <div className='chat-container'>
          <ChatHistory opened={opened} onClose={close} />
          <Chat />
        </div>
      </div>
    </MantineProvider>
  );
};

const rootElement = document.getElementById('root');
const root = createRoot(rootElement!);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);
