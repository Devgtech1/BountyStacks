use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWxTWqkZ6W2BeZ7FEfcYkgMQhg3q");

pub const MIN_REWARD_LAMPORTS: u64 = 50_000_000; // 0.05 SOL placeholder; not a USD price check.

#[program]
pub mod bountystacks {
    use super::*;

    pub fn create_task(
        ctx: Context<CreateTask>,
        task_id: u64,
        requirements_hash: [u8; 32],
        reward_lamports: u64,
        deadline: i64,
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(deadline > now, BountyError::DeadlineMustBeFuture);
        require!(
            reward_lamports >= MIN_REWARD_LAMPORTS,
            BountyError::RewardBelowMinimum
        );

        let cpi_accounts = Transfer {
            from: ctx.accounts.creator.to_account_info(),
            to: ctx.accounts.task.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), cpi_accounts),
            reward_lamports,
        )?;

        let task = &mut ctx.accounts.task;
        task.creator = ctx.accounts.creator.key();
        task.task_id = task_id;
        task.requirements_hash = requirements_hash;
        task.reward_lamports = reward_lamports;
        task.deadline = deadline;
        task.submission_count = 0;
        task.status = TaskStatus::Open;
        task.bump = ctx.bumps.task;
        Ok(())
    }

    pub fn submit_solution(ctx: Context<SubmitSolution>, solution_hash: [u8; 32]) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(
            ctx.accounts.task.status == TaskStatus::Open,
            BountyError::TaskNotOpen
        );
        require!(
            now <= ctx.accounts.task.deadline,
            BountyError::SubmissionDeadlinePassed
        );
        require!(
            ctx.accounts.submitter.key() != ctx.accounts.task.creator,
            BountyError::CreatorCannotSubmit
        );

        let submission = &mut ctx.accounts.submission;
        submission.task = ctx.accounts.task.key();
        submission.submitter = ctx.accounts.submitter.key();
        submission.solution_hash = solution_hash;
        submission.submitted_at = now;
        submission.bump = ctx.bumps.submission;
        ctx.accounts.task.submission_count = ctx
            .accounts
            .task
            .submission_count
            .checked_add(1)
            .ok_or(BountyError::ArithmeticOverflow)?;
        Ok(())
    }

    pub fn accept_submission(ctx: Context<AcceptSubmission>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let task = &mut ctx.accounts.task;
        require!(
            task.creator == ctx.accounts.creator.key(),
            BountyError::Unauthorized
        );
        require!(task.status == TaskStatus::Open, BountyError::TaskNotOpen);
        require!(
            ctx.accounts.submission.task == task.key(),
            BountyError::SubmissionTaskMismatch
        );
        require!(
            ctx.accounts.submission.submitter == ctx.accounts.winner.key(),
            BountyError::WinnerMismatch
        );
        require!(task.submission_count > 0, BountyError::NoSubmissions);

        let reward = task.reward_lamports;
        let task_info = task.to_account_info();
        let winner_info = ctx.accounts.winner.to_account_info();
        let rent_reserve = Rent::get()?.minimum_balance(task_info.data_len());
        require!(
            task_info.lamports().saturating_sub(reward) >= rent_reserve,
            BountyError::EscrowInsufficient
        );
        let task_balance = task_info.lamports();
        let winner_balance = winner_info.lamports();
        **task_info.try_borrow_mut_lamports()? = task_balance
            .checked_sub(reward)
            .ok_or(BountyError::ArithmeticOverflow)?;
        **winner_info.try_borrow_mut_lamports()? = winner_balance
            .checked_add(reward)
            .ok_or(BountyError::ArithmeticOverflow)?;

        task.status = TaskStatus::Completed;
        let record = &mut ctx.accounts.completion;
        record.task = task.key();
        record.creator = task.creator;
        record.winner = ctx.accounts.winner.key();
        record.reward_paid = reward;
        record.accepted_at = now;
        record.requirements_hash = task.requirements_hash;
        record.bump = ctx.bumps.completion;
        Ok(())
    }

    pub fn refund_expired_task(ctx: Context<RefundExpiredTask>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let task = &mut ctx.accounts.task;
        require!(task.creator == ctx.accounts.creator.key(), BountyError::Unauthorized);
        require!(task.status == TaskStatus::Open, BountyError::TaskNotOpen);
        require!(now > task.deadline, BountyError::DeadlineNotPassed);
        // Never allow a creator to reclaim funds after contributors have submitted work.
        // Such tasks must remain escrowed for an explicit review/dispute resolution path.
        require!(task.submission_count == 0, BountyError::SubmissionsExist);
        let refund = task.reward_lamports;
        let task_info = task.to_account_info();
        let creator_info = ctx.accounts.creator.to_account_info();
        let rent_reserve = Rent::get()?.minimum_balance(task_info.data_len());
        require!(
            task_info.lamports().saturating_sub(refund) >= rent_reserve,
            BountyError::EscrowInsufficient
        );
        let task_balance = task_info.lamports();
        let creator_balance = creator_info.lamports();
        **task_info.try_borrow_mut_lamports()? = task_balance
            .checked_sub(refund)
            .ok_or(BountyError::ArithmeticOverflow)?;
        **creator_info.try_borrow_mut_lamports()? = creator_balance
            .checked_add(refund)
            .ok_or(BountyError::ArithmeticOverflow)?;
        task.status = TaskStatus::Refunded;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(task_id: u64)]
pub struct CreateTask<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + Task::INIT_SPACE,
        seeds = [b"task", creator.key().as_ref(), &task_id.to_le_bytes()],
        bump
    )]
    pub task: Account<'info, Task>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitSolution<'info> {
    #[account(mut)]
    pub submitter: Signer<'info>,
    #[account(mut, seeds = [b"task", task.creator.as_ref(), &task.task_id.to_le_bytes()], bump = task.bump)]
    pub task: Account<'info, Task>,
    #[account(
        init,
        payer = submitter,
        space = 8 + Submission::INIT_SPACE,
        seeds = [b"submission", task.key().as_ref(), submitter.key().as_ref()],
        bump
    )]
    pub submission: Account<'info, Submission>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcceptSubmission<'info> {
    #[account(mut, address = task.creator @ BountyError::Unauthorized)]
    pub creator: Signer<'info>,
    #[account(mut, seeds = [b"task", task.creator.as_ref(), &task.task_id.to_le_bytes()], bump = task.bump)]
    pub task: Account<'info, Task>,
    #[account(
        seeds = [b"submission", task.key().as_ref(), winner.key().as_ref()],
        bump = submission.bump,
        has_one = task,
        constraint = submission.submitter == winner.key() @ BountyError::WinnerMismatch
    )]
    pub submission: Account<'info, Submission>,
    /// CHECK: The winner is only a lamport recipient; the submission PDA binds this key.
    #[account(mut, address = submission.submitter)]
    pub winner: UncheckedAccount<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + CompletionRecord::INIT_SPACE,
        seeds = [b"completion", task.key().as_ref()],
        bump
    )]
    pub completion: Account<'info, CompletionRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RefundExpiredTask<'info> {
    #[account(mut, address = task.creator @ BountyError::Unauthorized)]
    pub creator: Signer<'info>,
    #[account(mut, seeds = [b"task", task.creator.as_ref(), &task.task_id.to_le_bytes()], bump = task.bump)]
    pub task: Account<'info, Task>,
}

#[account]
#[derive(InitSpace)]
pub struct Task {
    pub creator: Pubkey,
    pub task_id: u64,
    pub requirements_hash: [u8; 32],
    pub reward_lamports: u64,
    pub deadline: i64,
    pub submission_count: u32,
    pub status: TaskStatus,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Submission {
    pub task: Pubkey,
    pub submitter: Pubkey,
    pub solution_hash: [u8; 32],
    pub submitted_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct CompletionRecord {
    pub task: Pubkey,
    pub creator: Pubkey,
    pub winner: Pubkey,
    pub reward_paid: u64,
    pub accepted_at: i64,
    pub requirements_hash: [u8; 32],
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum TaskStatus {
    Open,
    Completed,
    Refunded,
}

#[error_code]
pub enum BountyError {
    #[msg("The deadline must be in the future.")]
    DeadlineMustBeFuture,
    #[msg("The reward is below the configured minimum.")]
    RewardBelowMinimum,
    #[msg("This task is not open.")]
    TaskNotOpen,
    #[msg("The submission deadline has passed.")]
    SubmissionDeadlinePassed,
    #[msg("The task creator cannot submit to their own task.")]
    CreatorCannotSubmit,
    #[msg("Only the task creator may perform this action.")]
    Unauthorized,
    #[msg("The submission does not belong to this task.")]
    SubmissionTaskMismatch,
    #[msg("The selected winner does not match the submission.")]
    WinnerMismatch,
    #[msg("There are no submissions for this task.")]
    NoSubmissions,
    #[msg("The task deadline has not passed.")]
    DeadlineNotPassed,
    #[msg("Contributors have submitted work; escrow cannot be refunded through the expiry path.")]
    SubmissionsExist,
    #[msg("Escrow does not contain the expected reward and rent reserve.")]
    EscrowInsufficient,
    #[msg("Arithmetic overflow.")]
    ArithmeticOverflow,
}
