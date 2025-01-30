import './Navbar.css';
// import { IoMenuOutline } from "react-icons/io5";
// import { Button } from "@mantine/core";

import david from '../../assets/david.svg';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { memo } from 'react';

const Navbar = () => {
  return (
    <div className='navbar'>
      <div className='navbar-left'>
        {/* <Button variant='default' onClick={onMenuClick}>
          <IoMenuOutline />
        </Button> */}
        <a href='/'>
          <div className='navbar-logo'>
            <img
              src={david}
              alt='David'
              width='50px'
              height='50px'
              className='navbar-logo-img'
            />
            <h1 className='navbar-logo-text'>Chainference</h1>
          </div>
        </a>
      </div>
      <div className='wallet'>
        <WalletMultiButton />
      </div>
    </div>
  );
};

export default memo(Navbar);
