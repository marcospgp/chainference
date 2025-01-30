// This line is required to avoid displaying some warnings.
// See: https://github.com/coral-xyz/anchor/pull/3396
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("7Gz2FThJQ3bqJsub9MLcZrbktub2HmyWksYSX2z8WQgH");

#[program]
pub mod chainference {
    use super::*;

    pub fn add_server(ctx: Context<AddServerCtx>, models: Vec<ModelListing>) -> Result<()> {
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

    pub fn close_server(_ctx: Context<CloseServerCtx>) -> Result<()> {
        Ok(())
    }

    pub fn request_inference(
        ctx: Context<InferenceRequestCtx>,
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

    pub fn lock_request(ctx: Context<LockRequestCtx>, send_prompt_to: String) -> Result<()> {
        let request = &mut ctx.accounts.request;
        let server = &ctx.accounts.server;

        // Ensure server provides the requested model
        if !server.models.iter().any(|m| m.id == request.model) {
            return Err(ProgramError::InvalidArgument.into());
        }

        // Ensure request is not already locked
        if request.locked_by.is_some() {
            return Err(ProgramError::InvalidArgument.into());
        }

        // Lock the request
        request.locked_by = Some(ctx.accounts.owner.key());
        request.send_prompt_to = send_prompt_to;

        Ok(())
    }

    pub fn claim_payment(ctx: Context<ClaimPaymentCtx>, amount: u64) -> Result<()> {
        let request = &mut ctx.accounts.request;
        let server_owner = &mut ctx.accounts.server_owner;
        let requester = &mut ctx.accounts.requester;

        if request.locked_by != Some(server_owner.key()) {
            return Err(ProgramError::InvalidArgument.into());
        }

        if amount > request.max_cost {
            return Err(ProgramError::InvalidArgument.into());
        }

        let total_balance = **request.to_account_info().lamports.borrow();
        let remaining_balance = total_balance.saturating_sub(amount);

        **request.to_account_info().try_borrow_mut_lamports()? -= amount;
        **server_owner.to_account_info().try_borrow_mut_lamports()? += amount;

        if remaining_balance > 0 {
            **request.to_account_info().try_borrow_mut_lamports()? -= remaining_balance;
            **requester.to_account_info().try_borrow_mut_lamports()? += remaining_balance;
        }

        request.max_cost = 0;

        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct ServerAccount {
    pub owner: Pubkey,
    // Hugging face model IDs and corresponding price per 1M output tokens.
    // Max len preallocates space for entries.
    #[max_len(0)] // We set size later.
    pub models: Vec<ModelListing>,
    // Timestamp of last heartbeat.
    pub last_heartbeat: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, InitSpace)]
pub struct ModelListing {
    #[max_len(0)] // We set size later.
    pub id: String,
    pub price: u64,
}

#[account]
#[derive(InitSpace)]
pub struct InferenceRequestAccount {
    pub requester: Pubkey,
    #[max_len(0)] // We set size later.
    pub model: String,
    // Max cost in lamports for entire inference.
    // This account will hold this value in the balance.
    pub max_cost: u64,
    pub locked_by: Option<Pubkey>,
    #[max_len(128)]
    pub send_prompt_to: String,
}

#[derive(Accounts)]
#[instruction(models: Vec<ModelListing>)]
pub struct AddServerCtx<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + ServerAccount::INIT_SPACE + models.iter().map(|m| ModelListing::INIT_SPACE + m.id.len()).sum::<usize>(),
        seeds = [b"server", owner.key().as_ref()],
        bump
    )]
    pub server_account: Account<'info, ServerAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CloseServerCtx<'info> {
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
pub struct InferenceRequestCtx<'info> {
    pub system_program: Program<'info, System>,
    #[account(
        init,
        payer = requester,
        space = 8 + InferenceRequestAccount::INIT_SPACE + model.len(),
        seeds = [b"request", requester.key().as_ref()],
        bump
    )]
    pub request: Account<'info, InferenceRequestAccount>,
    #[account(mut)]
    pub requester: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(send_prompt_to: String)]
pub struct LockRequestCtx<'info> {
    #[account(mut)]
    pub request: Account<'info, InferenceRequestAccount>,
    #[account(
        mut,
        has_one = owner
    )]
    pub server: Account<'info, ServerAccount>,
    #[account()]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimPaymentCtx<'info> {
    #[account(
        mut,
        has_one = requester
    )]
    pub request: Account<'info, InferenceRequestAccount>,

    #[account(mut)]
    pub server_owner: Signer<'info>,

    #[account(mut)]
    pub requester: SystemAccount<'info>,
}
