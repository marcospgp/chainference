import { Stack, Text, Paper, TextInput, Group, Button } from '@mantine/core';

export function PromptInput() {
  return (
    <Stack px="xl" maw="100%" mah="100%" mx="auto" flex={1} justify="center">
      <Text size="xl" fw={700} c="white" ta="start">Prompt the blockchain</Text>
      <Paper bg="dark.7" p="md" radius="md">
        <TextInput
          placeholder="Start writing..."
          variant="unstyled"
          size="xl"
          styles={{
            input: {
              color: 'white',
              '&::placeholder': {
                color: 'gray'
              },
              fontSize: '1.1rem',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              padding: '0'
            },
            wrapper: {
              height: '80px'
            }
          }}
        />
        <Group justify="space-between" mt="xs">
          <Text size="sm" c="teal.4">2 servers matched • max $0.10 / SOL 0.0004</Text>
          <Button variant="subtle" color="blue" size="sm">
            Send
          </Button>
        </Group>
      </Paper>
    </Stack>
  );
} 