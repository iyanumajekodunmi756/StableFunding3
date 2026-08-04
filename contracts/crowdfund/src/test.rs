#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Env,
};

/// Registers the campaign token (Stellar Asset Contract), deploys the
/// crowdfund contract, and initializes it.
///
/// Returns the contract id, token address, and a token client (balances).
fn setup(env: &Env, target: u32, deadline: u64) -> (Address, Address, token::Client<'_>) {
    let admin = Address::generate(env);
    let token = env.register_stellar_asset_contract_v2(admin.clone()).address();
    let token_client = token::Client::new(env, &token);

    let contract_id = env.register(CrowdfundContract, ());
    let client = CrowdfundContractClient::new(env, &contract_id);
    client.initialize(&target, &deadline, &token);

    (contract_id, token, token_client)
}

/// Mints `amount` of the campaign token to `to`. Tests run with
/// `env.mock_all_auths()`, so admin auth is auto-approved.
fn mint(env: &Env, token: &Address, to: &Address, amount: i128) {
    let admin_client = token::StellarAssetClient::new(env, token);
    admin_client.mint(to, &amount);
}

#[test]
fn test_contribution_tracking() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1000);

    let (contract_id, token, token_client) = setup(&env, 1000, 5000);
    let client = CrowdfundContractClient::new(&env, &contract_id);

    let donor1 = Address::generate(&env);
    let donor2 = Address::generate(&env);
    mint(&env, &token, &donor1, 1000);
    mint(&env, &token, &donor2, 1000);

    let raised = client.fund(&donor1, &200);
    assert_eq!(raised, 200);
    let raised = client.fund(&donor2, &300);
    assert_eq!(raised, 500);

    // Inter-contract escrow: the contract holds the contributed tokens.
    assert_eq!(token_client.balance(&contract_id), 500);
    assert_eq!(token_client.balance(&donor1), 800);
    assert_eq!(token_client.balance(&donor2), 700);

    let status = client.get_status();
    assert_eq!(status.get(0).unwrap(), 500);
    assert_eq!(status.get(1).unwrap(), 1000);
    assert_eq!(status.get(2).unwrap(), 5000);
    assert_eq!(status.get(3).unwrap(), 0);
    assert_eq!(status.get(4).unwrap(), 0);
}

#[test]
fn test_claim_after_target_met_and_deadline_passed() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1000);

    let (contract_id, token, token_client) = setup(&env, 500, 2000);
    let client = CrowdfundContractClient::new(&env, &contract_id);

    let donor = Address::generate(&env);
    mint(&env, &token, &donor, 500);

    let raised = client.fund(&donor, &500);
    assert_eq!(raised, 500);
    assert_eq!(token_client.balance(&contract_id), 500);

    env.ledger().set_timestamp(3000);

    let caller = Address::generate(&env);
    let claimed = client.claim(&caller);
    assert_eq!(claimed, 500);

    // Inter-contract payout: escrowed funds moved from the contract to the caller.
    assert_eq!(token_client.balance(&contract_id), 0);
    assert_eq!(token_client.balance(&caller), 500);

    let status = client.get_status();
    assert_eq!(status.get(4).unwrap(), 1);
}

#[test]
#[should_panic(expected = "Campaign deadline has not yet passed")]
fn test_premature_claim_before_deadline_panics() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1000);

    let (contract_id, token, _token_client) = setup(&env, 500, 2000);
    let client = CrowdfundContractClient::new(&env, &contract_id);

    let donor = Address::generate(&env);
    mint(&env, &token, &donor, 500);
    client.fund(&donor, &500);

    let caller = Address::generate(&env);
    client.claim(&caller);
}

#[test]
#[should_panic(expected = "Funds have already been claimed")]
fn test_double_claim_panics() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1000);

    let (contract_id, token, _token_client) = setup(&env, 500, 2000);
    let client = CrowdfundContractClient::new(&env, &contract_id);

    let donor = Address::generate(&env);
    mint(&env, &token, &donor, 500);
    client.fund(&donor, &500);

    env.ledger().set_timestamp(3000);

    let caller = Address::generate(&env);
    client.claim(&caller);
    client.claim(&caller);
}

#[test]
#[should_panic(expected = "Campaign deadline has passed")]
fn test_fund_after_deadline_panics() {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(5000);

    let (contract_id, _token, _token_client) = setup(&env, 1000, 3000);
    let client = CrowdfundContractClient::new(&env, &contract_id);

    let donor = Address::generate(&env);
    client.fund(&donor, &100);
}
