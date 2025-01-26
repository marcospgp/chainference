// This line is required to avoid displaying some warnings.
// See: https://github.com/coral-xyz/anchor/pull/3396
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("FCLpnW5o1XceMGRgFma8WjHoekhKSmraZ21mfkMkzdNZ");

#[program]
pub mod chainference {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}

#[account]
pub struct ServerAccount {
    // Public key of the server that created the account
    pub authority: Pubkey,
    // Models and their prices per 1M tokens
    pub models: Vec<(String, u64)>,
    // Timestamp of last heartbeat
    pub last_heartbeat: i64,
}
