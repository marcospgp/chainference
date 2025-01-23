import { Group, Text, Button } from '@mantine/core';

export function Header() {
  return (
    <Group h="100%" px="md" justify="space-between">
      <Text size="xl" fw={700} c="white">Chainference</Text>
      <Group>
        <Button variant="subtle" color="gray" radius="xl">Learn more</Button>
        <appkit-button />
      </Group>
    </Group>
  );
} 