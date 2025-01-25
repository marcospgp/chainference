import { Button, Textarea } from "@mantine/core";
import { IoSendSharp } from "react-icons/io5";
import "./Chat.css";

export default function Chat() {
  return (
    <div className="prompt">
      <h1>Prompt the blockchain</h1>
      <div className="prompt-box">
        <div className="prompt-input">
          <Textarea variant="unstyled" placeholder="Why is the sky blue?" />
          <Button variant="default">
            <IoSendSharp />
          </Button>
        </div>
        <span>🟢 2 servers matched • max $0.10 / SOL 0.0004</span>
      </div>
    </div>
  );
}
