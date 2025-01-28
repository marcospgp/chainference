import React, { useState, useRef, useEffect } from "react";
import {
  Badge,
  Flex,
  NumberFormatter,
  ScrollArea,
  Text,
  Textarea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { IoSendSharp, IoSettingsSharp } from "react-icons/io5";

import "./Chat.css";
import SettingsModal from "./SettingsModal/SettingsModal";

interface ChatMessage {
  id: string;
  text: string;
  isResponse: boolean;
  isTyping?: boolean;
}

export default function Chat() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [opened, { open, close }] = useDisclosure();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const simulateTypingResponse = (fullResponse: string) => {
    const responseId = Date.now().toString();
    let currentText = "";

    // Start with empty message
    setChatMessages((messages) => [
      ...messages,
      {
        id: responseId,
        text: "",
        isResponse: true,
        isTyping: true,
      },
    ]);

    // Simulate typing character by character
    const typingInterval = setInterval(() => {
      if (currentText.length < fullResponse.length) {
        currentText += fullResponse[currentText.length];
        setChatMessages((messages) =>
          messages.map((msg) =>
            msg.id === responseId ? { ...msg, text: currentText } : msg
          )
        );
      } else {
        // Remove typing indicator when done
        setChatMessages((messages) =>
          messages.map((msg) =>
            msg.id === responseId ? { ...msg, isTyping: false } : msg
          )
        );
        clearInterval(typingInterval);
      }
    }, 50); // Adjust speed as needed
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: input,
      isResponse: false,
    };

    setChatMessages([...chatMessages, newMessage]);
    setInput("");

    // Simulate a response after a short delay
    setTimeout(() => {
      simulateTypingResponse(
        "hey yooo this is fucking tripping yo i can simulate the prompt response like this and it looks coooooooooooool"
      );
    }, 1000);
  };

  const numOfServers = 2; // Replace with actual number of servers
  const priceInUSD = 2; // Replace with actual price
  const priceInSOL = 0.001; // Replace with actual price
  const random = React.useRef(Math.random() * 200).current;

  return (
    <>
      <SettingsModal opened={opened} onClose={close} />
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
                  variant="unstyled"
                  placeholder="Why is the sky blue?"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
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
                  }${numOfServers} / ${Math.floor(random)} servers matched`}
                </Badge>
                <Flex
                  flex={1}
                  justify="start"
                  align="center"
                  style={{ alignSelf: "flex-end" }}
                >
                  <Text size="xs">{`Max price: $${priceInUSD} / SOL ${priceInSOL}`}</Text>
                </Flex>
              </div>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea h="60vh" mah="60vh" className="messages-container">
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
                  placeholder="Continue the conversation..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
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
                  }${numOfServers} / ${Math.floor(random)} servers matched`}
                </Badge>
                <Flex
                  flex={1}
                  justify="start"
                  align="center"
                  style={{ alignSelf: "flex-end" }}
                >
                  <Text size="xs">{`Max price: $${priceInUSD} / SOL ${priceInSOL}`}</Text>
                </Flex>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
