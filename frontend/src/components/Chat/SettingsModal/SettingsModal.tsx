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
import { memo } from "react";
import type { Model } from "../Chat";

const SettingsModal = ({
  opened,
  onClose,
  state,
  dispatch,
  availableModels,
  numOfServers,
}: {
  opened: boolean;
  onClose: () => void;
  state: { model: string; maxCost: number };
  dispatch: (action: { type: string; payload: any }) => void;
  availableModels: Set<Model>;
  numOfServers: number;
}) => {
  const [isOpened, { toggle }] = useDisclosure();

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
          data={Array.from(availableModels).map((model) => model.id)}
          comboboxProps={{
            transitionProps: { transition: "pop", duration: 200 },
          }}
          onChange={(value) => dispatch({ type: "SET_MODEL", payload: value })}
          value={state.model}
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
          step={0.0001}
          onChange={(value) =>
            dispatch({ type: "SET_MAX_COST", payload: value })
          }
          value={state.maxCost}
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
          disabled
          classNames={{
            root: "select-root",
            label: "select-label",
            input: "select-input",
            wrapper: "select-wrapper",
          }}
        />
        <div className="settings-modal-advanced">
          <p>Advanced (coming soon)</p>
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
              disabled
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
              disabled
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
              disabled
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
          {`${
            numOfServers > 0 ? `🟢 ` : `🔴 `
          }${numOfServers} / ${numOfServers} servers matched`}
        </Badge>
      </div>
    </Modal>
  );
};

export default memo(SettingsModal);
