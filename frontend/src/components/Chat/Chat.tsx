import React, { useState, useRef, useEffect, useReducer } from 'react';
import { Badge, Flex, ScrollArea, Text, Textarea, Loader } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAnchorWallet } from '@solana/wallet-adapter-react';

import { IoSendSharp, IoSettingsSharp } from 'react-icons/io5';

import './Chat.css';
import SettingsModal from './SettingsModal/SettingsModal';
import type { Program } from '@coral-xyz/anchor';
import type { Chainference } from '../../../../solana/target/types/chainference';
import { createInferenceRequest } from '../../utils/chainferenceProgram';
import useSolanaProgramListener from '../../hooks/useSolanaProgramListener';

interface ChatMessage {
  id: string;
  text: string;
  isResponse: boolean;
  isTyping?: boolean;
}

const reducer = (state: any, action: any) => {
  switch (action.type) {
    case 'SET_MODEL':
      return { ...state, model: action.payload };
    case 'SET_MAX_COST':
      return { ...state, maxCost: action.payload };
    default:
      return state;
  }
};

export default function Chat({ program }: { program: Program<Chainference> }) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [opened, { open, close }] = useDisclosure();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const programState = useSolanaProgramListener(
    program.programId,
    program.provider.connection
  );

  const initialState = {
    model: '',
    maxCost: 0,
  };

  const [state, dispatch] = useReducer(reducer, initialState);
  const wallet = useAnchorWallet();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (programState) {
      setLoading(false);
    }
  }, [programState]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // const simulateTypingResponse = (fullResponse: string) => {
  //   const responseId = Date.now().toString();
  //   let currentText = '';

  //   // Start with empty message
  //   setChatMessages((messages) => [
  //     ...messages,
  //     {
  //       id: responseId,
  //       text: '',
  //       isResponse: true,
  //       isTyping: true,
  //     },
  //   ]);

  //   // Simulate typing character by character
  //   const typingInterval = setInterval(() => {
  //     if (currentText.length < fullResponse.length) {
  //       currentText += fullResponse[currentText.length];
  //       setChatMessages((messages) =>
  //         messages.map((msg) =>
  //           msg.id === responseId ? { ...msg, text: currentText } : msg
  //         )
  //       );
  //     } else {
  //       // Remove typing indicator when done
  //       setChatMessages((messages) =>
  //         messages.map((msg) =>
  //           msg.id === responseId ? { ...msg, isTyping: false } : msg
  //         )
  //       );
  //       clearInterval(typingInterval);
  //     }
  //   }, 50); // Adjust speed as needed
  // };

  const handleSend = () => {
    if (!input.trim()) return;
    setLoading(true);

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: input,
      isResponse: false,
    };

    createInferenceRequest(program, state.model, state.maxCost);

    // Add a small delay when transitioning from empty to has-messages
    if (chatMessages.length === 0) {
      setTimeout(() => {
        setChatMessages([newMessage]);
      }, 50);
    } else {
      setChatMessages([...chatMessages, newMessage]);
    }
    setInput('');

    // Simulate a response after a short delay
    // setTimeout(() => {
    //   simulateTypingResponse(
    //     'hey yooo this is fucking tripping yo i can simulate the prompt response like this and it looks coooooooooooool'
    //   );
    // }, 1000);
  };

  const numOfServers = 2; // Replace with actual number of servers
  const priceInUSD = 2; // Replace with actual price
  const priceInSOL = 0.001; // Replace with actual price
  const random = React.useRef(Math.random() * 200).current;

  return (
    <>
      <SettingsModal
        opened={opened}
        onClose={close}
        state={state}
        dispatch={dispatch}
      />
      <div
        className={`prompt ${
          chatMessages.length > 0 ? 'has-messages' : 'empty'
        }`}
      >
        {chatMessages.length === 0 ? (
          <div>
            <h1 className='prompt-title'>Prompt the blockchain</h1>
            <div className='prompt-box'>
              <div className='prompt-input'>
                <Textarea
                  disabled={!wallet}
                  variant='unstyled'
                  placeholder='Why is the sky blue?'
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  error={
                    (state?.maxCost === 0 || state?.model === '') &&
                    'Please select a model and max cost'
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <IoSendSharp className='send-icon' onClick={handleSend} />
              </div>
              <div className='prompt-info'>
                <IoSettingsSharp className='settings-icon' onClick={open} />
                <Badge size='lg'>
                  {`${
                    numOfServers > 0 ? `🟢 ` : `🔴 `
                  }${numOfServers} / ${Math.floor(random)} servers matched`}
                </Badge>
                <Flex
                  flex={1}
                  justify='start'
                  align='center'
                  style={{ alignSelf: 'flex-end' }}
                >
                  <Text size='xs'>{`Max price: SOL ${state.maxCost}`}</Text>
                </Flex>
              </div>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className='messages-container'>
              {chatMessages.map((message) => (
                <Flex
                  flex={1}
                  key={message.id}
                  mb={'xl'}
                  justify={message.isResponse ? 'start' : 'end'}
                >
                  <div className='message'>{message.text}</div>
                </Flex>
              ))}
              <div ref={messagesEndRef} />
            </ScrollArea>
            <div className='prompt-box'>
              <div className='prompt-input'>
                <Textarea
                  variant='unstyled'
                  style={{ flex: 1 }}
                  disabled={loading}
                  placeholder='Continue the conversation...'
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  error={
                    (state?.maxCost === 0 || state?.model === '') &&
                    'Please set a model and max cost'
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                {loading ? (
                  <Loader className='loader' />
                ) : (
                  <IoSendSharp className='send-icon' onClick={handleSend} />
                )}
              </div>
              <div className='prompt-info'>
                <IoSettingsSharp className='settings-icon' onClick={open} />
                <Badge size='lg'>
                  {`${
                    numOfServers > 0 ? `🟢 ` : `🔴 `
                  }${numOfServers} / ${Math.floor(random)} servers matched`}
                </Badge>
                <Flex
                  flex={1}
                  justify='start'
                  align='center'
                  style={{ alignSelf: 'flex-end' }}
                >
                  <Text size='xs'>{`Max price: SOL ${state.maxCost}`}</Text>
                </Flex>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
