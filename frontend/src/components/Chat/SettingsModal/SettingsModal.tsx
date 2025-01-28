import {
  ActionIcon,
  Badge,
  Collapse,
  Modal,
  NumberInput,
  Select,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IoIosArrowDown } from "react-icons/io";
import "./SettingsModal.css";

const SettingsModal = ({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) => {
  const [isOpened, { toggle }] = useDisclosure();

  const modelName = [
    "meta-llama/Llama-3.1-8B-Instruct",
    "meta-llama/Meta-Llama-3-8B-Instruct",
    "meta-llama/Llama-3.2-3B-Instruct",
    "meta-llama/Llama-2-7b-chat-hf",
    "meta-llama/Llama-3.2-1B",
    "meta-llama/Llama-2-7b-hf",
    "meta-llama/Llama-3.2-1B-Instruct",
  ];

  const numOfServers = 5;

  return (
    <Modal
      className="settings-modal"
      style={{
        boxShadow: "none",
      }}
      size="md"
      title="Prompt settings"
      opened={opened}
      onClose={onClose}
      centered
    >
      <div className="settings-modal-content">
        <Select
          label="Model"
          placeholder="Pick inference model"
          data={modelName}
          comboboxProps={{
            transitionProps: { transition: "pop", duration: 200 },
          }}
          classNames={{
            root: "select-root",
            label: "select-label",
            input: "select-input",
            wrapper: "select-wrapper",
          }}
        />
        <NumberInput
          label="Max price per 1000 tokens"
          placeholder="0"
          min={0}
          step={0.1}
          prefix="SOL "
          classNames={{
            root: "select-root",
            label: "select-label",
            input: "select-input",
            wrapper: "select-wrapper",
          }}
        />
        <NumberInput
          label="Max tokens per response (0 for unlimited)"
          placeholder="0"
          min={0}
          step={100}
          classNames={{
            root: "select-root",
            label: "select-label",
            input: "select-input",
            wrapper: "select-wrapper",
          }}
        />
        <div className="settings-modal-advanced">
          <p>Advanced</p>
          <ActionIcon variant="transparent">
            <IoIosArrowDown color="white" onClick={toggle} />
          </ActionIcon>
        </div>
        <Collapse in={isOpened}>
          <div className="settings-modal-advanced-collapse-wrapper">
            <NumberInput
              label="Minimum success rate"
              placeholder="0"
              min={0}
              max={100}
              step={1}
              suffix="%"
              classNames={{
                root: "select-root",
                label: "select-label",
                input: "select-input",
                wrapper: "select-wrapper",
              }}
            />
            <NumberInput
              label="Minimum preference rate"
              placeholder="0"
              min={0}
              max={100}
              step={1}
              suffix="%"
              classNames={{
                root: "select-root",
                label: "select-label",
                input: "select-input",
                wrapper: "select-wrapper",
              }}
            />
            <NumberInput
              label="Minimum completed inferences"
              placeholder="100000"
              min={0}
              step={1000}
              classNames={{
                root: "select-root",
                label: "select-label",
                input: "select-input",
                wrapper: "select-wrapper",
              }}
            />
          </div>
        </Collapse>
        <Badge size="lg">
          {`${numOfServers > 0 ? `🟢 ` : `🔴 `}${numOfServers} / ${Math.floor(
            Math.random() * 200
          )} servers matched`}
        </Badge>
      </div>
    </Modal>
  );
};

export default SettingsModal;
