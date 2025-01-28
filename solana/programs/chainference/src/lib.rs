// This line is required to avoid displaying some warnings.
// See: https://github.com/coral-xyz/anchor/pull/3396
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("9jqV7her1GXtVidpqYDvW24EHfbtnUMFP1kjC5ZY5Wih");

#[program]
pub mod chainference {
    use super::*;

    pub fn add_server(
        ctx: Context<AddServerInput>,
        _space: u64,
        models: Vec<ModelListing>,
    ) -> Result<()> {
        // Limit max model listings per server.
        if models.len() > 256 {
            return Err(ProgramError::InvalidArgument.into());
        }

        let server_account = &mut ctx.accounts.server_account;

        server_account.owner = ctx.accounts.owner.key();
        server_account.models = models;
        server_account.last_heartbeat = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn close_server(_ctx: Context<CloseServerInput>) -> Result<()> {
        Ok(())
    }

    pub fn request_inference(
        ctx: Context<RequestInput>,
        _space: u64,
        created_at: i64,
        model: String,
        max_cost: u64,
    ) -> Result<()> {
        let current_time = Clock::get()?.unix_timestamp;

        // Ensure timestamp is reasonable.
        if created_at < current_time - 60 || created_at > current_time + 60 {
            return Err(ProgramError::InvalidArgument.into());
        }

        // Ensure max_cost is non-zero.
        if max_cost == 0 {
            return Err(ProgramError::InvalidArgument.into());
        }

        // Transfer SOL from the requester to the stake account.
        **ctx
            .accounts
            .stake
            .to_account_info()
            .try_borrow_mut_lamports()? += max_cost;
        **ctx
            .accounts
            .requester
            .to_account_info()
            .try_borrow_mut_lamports()? -= max_cost;

        // Initialize the inference request account.
        let request = &mut ctx.accounts.request;
        request.requester = ctx.accounts.requester.key();
        request.model = model;
        request.max_cost = max_cost;
        request.stake = ctx.accounts.stake.key();
        request.created_at = created_at;

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

#[account]
pub struct Request {
    pub requester: Pubkey,
    pub model: String,
    // Max cost in lamports for entire inference.
    pub max_cost: u64,
    pub stake: Pubkey,
    pub created_at: i64,
}

#[account]
pub struct Stake {}

#[derive(Accounts)]
#[instruction(space: u64)]
pub struct AddServerInput<'info> {
    #[account(
        init,
        payer = owner,
        space = space as usize,
        seeds = [b"server", owner.key().as_ref()],
        bump
    )]
    pub server_account: Account<'info, ServerAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseServerInput<'info> {
    #[account(
        mut,
        close = owner
    )]
    pub server_account: Account<'info, ServerAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(space: u64, created_at: i64, model: String, max_cost: u64)]
pub struct RequestInput<'info> {
    #[account(
        init,
        payer = requester,
        space = space as usize,
        seeds = [b"inference", requester.key().as_ref(), model.as_bytes(), &created_at.to_le_bytes()],
        bump
    )]
    pub request: Account<'info, Request>,

    #[account(mut)]
    pub requester: Signer<'info>,

    #[account(
        init,
        payer = requester,
        space = 0,
        seeds = [b"stake", requester.key().as_ref(), &created_at.to_le_bytes()],
        bump
    )]
    pub stake: Account<'info, Stake>,

    pub system_program: Program<'info, System>,
}
