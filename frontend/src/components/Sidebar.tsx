import { Stack, Text, Button, Group } from '@mantine/core';

interface Chat {
  title: string;
  date: string;
  messages: number;
}

interface SidebarProps {
  chatHistory: Chat[];
}

export function Sidebar({ chatHistory }: SidebarProps) {
  return (
    <Stack>
      <Text fw={500} size='sm' c='white'>
        Chats
      </Text>
      <Button variant='subtle' color='gray' justify='start'>
        New conversation
      </Button>
      {chatHistory.map((chat, index) => (
        <Button
          key={index}
          variant='subtle'
          color='gray'
          justify='start'
          styles={{
            label: {
              whiteSpace: 'normal',
              textAlign: 'start',
            },
          }}
        >
          <Stack gap={2}>
            <Text size='sm' truncate>
              {chat.title}
            </Text>
            <Group gap={4}>
              <Text size='xs' c='dimmed'>
                {chat.date}
              </Text>
              <Text size='xs' c='dimmed'>
                •
              </Text>
              <Text size='xs' c='dimmed'>
                {chat.messages} messages
              </Text>
            </Group>
          </Stack>
        </Button>
      ))}
    </Stack>
  );
}
