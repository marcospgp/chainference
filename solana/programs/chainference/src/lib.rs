// This line is required to avoid displaying some warnings.
// See: https://github.com/coral-xyz/anchor/pull/3396
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("FCLpnW5o1XceMGRgFma8WjHoekhKSmraZ21mfkMkzdNZ");

#[program]
pub mod chainference {
    use super::*;

    pub fn announce_availability(
        ctx: Context<AvailabilityAnnouncementInput>,
        _space: u64,
        models: Vec<ModelListing>,
    ) -> Result<()> {
        if models.len() > 256 {
            return Err(ProgramError::InvalidArgument.into());
        }

        let server_account = &mut ctx.accounts.server_account;

        server_account.owner = ctx.accounts.server.key();
        server_account.models = models;
        server_account.last_heartbeat = Clock::get()?.unix_timestamp;

        Ok(())
    }
}

#[account]
pub struct ServerAccount {
    pub owner: Pubkey,
    // Hugging face model IDs and corresponding price per 1M output tokens.
    // Max len preallocates space for entries.
    pub models: Vec<ModelListing>,
    // Timestamp of last heartbeat.
    pub last_heartbeat: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ModelListing {
    pub id: String,
    pub price: u64,
}

#[derive(Accounts)]
#[instruction(space: u64)]
pub struct AvailabilityAnnouncementInput<'info> {
    #[account(
        init,
        payer = server,
        space = space as usize,
        seeds = [b"server", server.key().as_ref()],
        bump
    )]
    pub server_account: Account<'info, ServerAccount>,
    #[account(mut)]
    pub server: Signer<'info>,
    pub system_program: Program<'info, System>,
}
