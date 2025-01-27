import { Drawer, ScrollArea } from '@mantine/core';
import './ChatHistory.css';

interface ChatHistoryProps {
  opened: boolean;
  onClose: () => void;
}

export default function ChatHistory({ opened, onClose }: ChatHistoryProps) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title='Chat History'
      scrollAreaComponent={ScrollArea.Autosize}
    >
      <div className='chat-history'>
        {Array.from({ length: 100 }).map((_, index) => (
          <div className='chat-entry'>
            <div className='chat-entry-message'>{index}</div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}
