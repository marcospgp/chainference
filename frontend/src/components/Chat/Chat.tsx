import React, { useState, useRef, useEffect, useReducer } from "react";
import {
  Badge,
  Flex,
  ScrollArea,
  Text,
  Textarea,
  Loader,
  Notification,
  TypographyStylesProvider,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useWallet } from "@solana/wallet-adapter-react";
import { marked } from "marked";
import { IoSendSharp, IoSettingsSharp, IoClose } from "react-icons/io5";

import "./Chat.css";
import SettingsModal from "./SettingsModal/SettingsModal";
import type { BN, Program } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import type { Chainference } from "../../../../solana/target/types/chainference";
import {
  cancelInferenceRequest,
  createInferenceRequest,
  waitForRequestToBeLocked,
  sendPrompt,
  type ChatMessage,
  useChainference,
} from "../../chainference";
import useSolanaProgramListener from "../../hooks/useSolanaProgramListener";
import type { ModelListing, DecodedAccount } from "../../chainference";

export type Model = {
  id: string;
  price: BN;
};

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

export default function Chat() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [opened, { open, close }] = useDisclosure();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLoader, setShowLoader] = useState(false);
  const chainference = useChainference();

  const programState = useSolanaProgramListener(chainference);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const isAlreadyRequesting = React.useMemo(() => {
    const res = programState.find((p) => p.type === "inferenceRequestAccount");
    return !!res;
  }, [programState]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

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

  const initialState = {
    model: "",
    maxCost: 0,
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  if (state.model === "" && Array.from(availableModels).length > 0) {
    dispatch({ type: "SET_MAX_COST", payload: 0.1 });
    dispatch({
      type: "SET_MODEL",
      payload: Array.from(availableModels)[0]?.id,
    });
  }

  const handleSend = async (chainference: anchor.Program<Chainference>) => {
    const inputValue = inputRef.current?.value.trim();
    if (!inputValue) return;

    if (!state.model || state.maxCost === 0) {
      setError("Please select a model and set a max cost first");
      return;
    }

    try {
      // Add user message
      const newMessage: ChatMessage = {
        role: "user",
        content: inputValue,
      };

      // Create the messages array that will be sent to the API
      const messagesToSend = [...chatMessages, newMessage];

      // Update UI with the new message
      if (chatMessages.length === 0) {
        console.log("First message, adding with delay");
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            setChatMessages([newMessage]);
            resolve();
          }, 50);
        });
      } else {
        setChatMessages([...chatMessages, newMessage]);
      }

      // Clear input
      if (inputRef.current) {
        inputRef.current.value = "";
      }

      // show loader while waiting for request to be locked
      setChatMessages((messages) => [
        ...messages,
        { role: "assistant", content: '<div class="loader"></div>' },
      ]);

      // Create inference request
      console.log(
        "Creating inference request with model:",
        state.model,
        "maxCost:",
        state.maxCost
      );

      if (isAlreadyRequesting) {
        await cancelInferenceRequest(chainference);
      }

      await createInferenceRequest(chainference, state.model, state.maxCost);
      console.log("Inference request created successfully");

      // Wait for request to be locked by a server
      console.log("Waiting for request to be locked...");
      const request = await waitForRequestToBeLocked(chainference, 100);
      console.log("Request locked successfully:", request);

      // Send prompt and handle streaming response
      console.log("Starting to send prompt and handle streaming...");

      await sendPrompt(request, messagesToSend, (chunk) => {
        setChatMessages((messages) =>
          messages.map((msg, index) =>
            index === messages.length - 1
              ? msg.content === '<div class="loader"></div>'
                ? { ...msg, content: chunk }
                : { ...msg, content: msg.content + chunk }
              : msg
          )
        );
      });
    } catch (error) {
      console.error("Error in chat:", error);
      // Remove any pending response messages
      setChatMessages(
        (messages) => messages.slice(0, -1) // Remove the last message which would be the incomplete assistant response
      );

      // Show error notification
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred while processing your request"
      );
    } finally {
      console.log("Chat interaction completed");
    }
  };

  return (
    <>
      {error && (
        <Notification
          color="red"
          title="Error"
          onClose={() => setError(null)}
          style={{ position: "fixed", top: 20, right: 20, zIndex: 1000 }}
        >
          {error}
        </Notification>
      )}
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
            <h1 className="prompt-title">Prompt the blockchain</h1>
            <div className="prompt-box">
              <div className="prompt-input">
                <Textarea
                  // disabled={!wallet || !state.model || numOfServers === 0}
                  variant="unstyled"
                  placeholder="Why is the sky blue?"
                  ref={inputRef}
                  // error={
                  //   (state?.maxCost === 0 || state?.model === "") &&
                  //   "Please select a model and max cost"
                  // }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (chainference !== null) {
                        handleSend(chainference);
                      }
                    }
                  }}
                />
                <IoSendSharp
                  className="send-icon"
                  onClick={() => {
                    if (chainference !== null) {
                      handleSend(chainference);
                    }
                  }}
                />
              </div>
              <div className="prompt-info">
                <Badge size="lg" className="clickable" onClick={open}>
                  {`${
                    numOfServers > 0 ? `🟢 ` : `🔴 `
                  }${numOfServers} / ${numOfServers} servers matched`}
                </Badge>
                <Flex
                  flex={1}
                  justify="start"
                  align="center"
                  style={{ alignSelf: "flex-end" }}
                ></Flex>
              </div>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="messages-container">
              {chatMessages.map((message, index) => (
                <Flex
                  flex={1}
                  key={index}
                  mb={"xl"}
                  justify={message.role === "assistant" ? "start" : "end"}
                >
                  <div
                    className={`message ${
                      message.role == "assistant"
                        ? "assistant-message"
                        : "user-message"
                    }`}
                  >
                    <TypographyStylesProvider>
                      <div
                        dangerouslySetInnerHTML={{
                          // @ts-expect-error
                          __html: marked.parse(message.content, {}),
                        }}
                      />
                    </TypographyStylesProvider>
                  </div>
                </Flex>
              ))}
              <div ref={messagesEndRef} />
            </ScrollArea>
            <div className="prompt-box">
              <div className="prompt-input">
                <Textarea
                  variant="unstyled"
                  style={{ flex: 1 }}
                  placeholder="Continue the conversation..."
                  ref={inputRef}
                  error={
                    (state?.maxCost === 0 || state?.model === "") &&
                    "Please set a model and max cost"
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (chainference !== null) {
                        handleSend(chainference);
                      }
                    }
                  }}
                />
                <IoSendSharp
                  className="send-icon"
                  onClick={() => {
                    if (chainference !== null) {
                      handleSend(chainference);
                    }
                  }}
                />
              </div>
              <div className="prompt-info">
                <Badge size="lg" className="clickable" onClick={open}>
                  {`${
                    numOfServers > 0 ? `🟢 ` : `🔴 `
                  }${numOfServers} / ${numOfServers} servers matched`}
                </Badge>
                <Flex
                  flex={1}
                  justify="start"
                  align="center"
                  style={{ alignSelf: "flex-end" }}
                ></Flex>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
