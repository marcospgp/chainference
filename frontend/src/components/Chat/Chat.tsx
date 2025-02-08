import React, { useState, useRef, useEffect, useReducer } from "react";
import { Badge, Flex, ScrollArea, Text, Textarea, Loader } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useAnchorWallet } from "@solana/wallet-adapter-react";

import { IoSendSharp, IoSettingsSharp, IoClose } from "react-icons/io5";

import "./Chat.css";
import SettingsModal from "./SettingsModal/SettingsModal";
import type { BN, Program } from "@coral-xyz/anchor";
import type { Chainference } from "../../../../solana/target/types/chainference";
import {
  cancelInferenceRequest,
  createInferenceRequest,
} from "../../utils/chainferenceProgram";
import useSolanaProgramListener from "../../hooks/useSolanaProgramListener";
import type {
  ModelListing,
  DecodedAccount,
} from "../../utils/chainferenceProgram";

export type Model = {
  id: string;
  price: BN;
};

interface ChatMessage {
  id: string;
  text: string;
  isResponse: boolean;
  isTyping?: boolean;
}

const reducer = (state: any, action: any) => {
  switch (action.type) {
    case "SET_MODEL":
      return { ...state, model: action.payload };
    case "SET_MAX_COST":
      return { ...state, maxCost: action.payload };
    default:
      return state;
  }
};

type ServerAccount = Extract<DecodedAccount, { type: "serverAccount" }>;

export default function Chat({ program }: { program: Program<Chainference> }) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [opened, { open, close }] = useDisclosure();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  const programState = useSolanaProgramListener(program);

  const initialState = {
    model: "",
    maxCost: 0,
  };

  const [state, dispatch] = useReducer(reducer, initialState);
  const wallet = useAnchorWallet();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    console.log("Program state", programState);
    if (!programState.find((p) => p.type === "inferenceRequestAccount")) {
      setLoading(false);
    } else {
      setLoading(true);
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
    const inputValue = inputRef.current?.value.trim();
    if (!inputValue) return;
    setLoading(true);

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputValue,
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
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    // Simulate a response after a short delay
    // setTimeout(() => {
    //   simulateTypingResponse(
    //     'hey yooo this is fucking tripping yo i can simulate the prompt response like this and it looks coooooooooooool'
    //   );
    // }, 1000);
  };

  const numOfServers = programState.filter(
    (p) => p.type === "serverAccount"
  ).length; // Replace with actual number of servers

  const availableModels: Set<Model> = React.useMemo(
    () =>
      programState
        .filter((p): p is ServerAccount => p.type === "serverAccount")
        .reduce((acc, curr) => {
          curr.data.models.forEach((model: ModelListing) => {
            acc.add({ id: model.id, price: model.price });
          });
          return acc;
        }, new Set<Model>()),
    [programState]
  );

  return (
    <>
      <SettingsModal
        opened={opened}
        onClose={close}
        state={state}
        dispatch={dispatch}
        availableModels={availableModels}
        numOfServers={numOfServers}
      />
      <div
        className={`prompt ${
          chatMessages.length > 0 ? "has-messages" : "empty"
        }`}
      >
        {chatMessages.length === 0 ? (
          <div>
            <h1 className="prompt-title">Prompt the bernardo chain</h1>
            <div className="prompt-box">
              <div className="prompt-input">
                <Textarea
                  disabled={!wallet || !state.model || numOfServers === 0}
                  variant="unstyled"
                  placeholder="Why is the sky blue?"
                  ref={inputRef}
                  error={
                    (state?.maxCost === 0 || state?.model === "") &&
                    "Please select a model and max cost"
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <IoSendSharp className="send-icon" onClick={handleSend} />
              </div>
              <div className="prompt-info">
                <IoSettingsSharp className="settings-icon" onClick={open} />
                <Badge size="lg">
                  {`${
                    numOfServers > 0 ? `🟢 ` : `🔴 `
                  }${numOfServers} / ${numOfServers} servers matched`}
                </Badge>
                <Flex
                  flex={1}
                  justify="start"
                  align="center"
                  style={{ alignSelf: "flex-end" }}
                >
                  <Text size="xs">{`Max price: SOL ${state.maxCost}`}</Text>
                </Flex>
              </div>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="messages-container">
              {chatMessages.map((message) => (
                <Flex
                  flex={1}
                  key={message.id}
                  mb={"xl"}
                  justify={message.isResponse ? "start" : "end"}
                >
                  <div className="message">{message.text}</div>
                </Flex>
              ))}
              <div ref={messagesEndRef} />
            </ScrollArea>
            <div className="prompt-box">
              <div className="prompt-input">
                <Textarea
                  variant="unstyled"
                  style={{ flex: 1 }}
                  disabled={loading}
                  placeholder="Continue the conversation..."
                  ref={inputRef}
                  error={
                    (state?.maxCost === 0 || state?.model === "") &&
                    "Please set a model and max cost"
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                {loading ? (
                  <div
                    className="loader-container"
                    onClick={() => cancelInferenceRequest(program)}
                  >
                    <Loader className="loader" />
                    <IoClose className="cancel-icon" />
                  </div>
                ) : (
                  <IoSendSharp className="send-icon" onClick={handleSend} />
                )}
              </div>
              <div className="prompt-info">
                <IoSettingsSharp className="settings-icon" onClick={open} />
                <Badge size="lg">
                  {`${
                    numOfServers > 0 ? `🟢 ` : `🔴 `
                  }${numOfServers} / ${numOfServers} servers matched`}
                </Badge>
                <Flex
                  flex={1}
                  justify="start"
                  align="center"
                  style={{ alignSelf: "flex-end" }}
                >
                  <Text size="xs">{`Max price: SOL ${state.maxCost}`}</Text>
                </Flex>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
