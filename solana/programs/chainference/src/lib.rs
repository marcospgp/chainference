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
        model: String,
        max_cost: u64,
    ) -> Result<()> {
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            ctx.accounts.requester.key,
            ctx.accounts.request.to_account_info().key,
            max_cost,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.requester.to_account_info(),
                ctx.accounts.request.to_account_info(),
            ],
        )?;

        // Initialize the inference request account.
        let request = &mut ctx.accounts.request;
        request.requester = ctx.accounts.requester.key();
        request.model = model;
        request.max_cost = max_cost;

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
    // This account will hold this value in the balance.
    pub max_cost: u64,
}

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
        close = owner,
        has_one = owner
    )]
    pub server_account: Account<'info, ServerAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(model: String)]
pub struct RequestInput<'info> {
    pub system_program: Program<'info, System>,
    #[account(
        init,
        payer = requester,
        space = 8 + 32 + (4 + model.len()) + 8,
        seeds = [b"request", requester.key().as_ref()],
        bump
    )]
    pub request: Account<'info, Request>,
    #[account(mut)]
    pub requester: Signer<'info>,
}
