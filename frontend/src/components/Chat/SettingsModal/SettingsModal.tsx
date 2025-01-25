import { Modal } from '@mantine/core';
import './SettingsModal.css';

const SettingsModal = ({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) => {
  return (
    <Modal
      className='settings-modal'
      style={{
        boxShadow: 'none',
      }}
      title='Settings'
      opened={opened}
      onClose={onClose}
      centered
    >
      <div>
        <p>Settings</p>
      </div>
    </Modal>
  );
};

export default SettingsModal;
