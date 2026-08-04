"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import { Networks } from "@creit.tech/stellar-wallets-kit/types";
import { FreighterModule } from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import { Client, networks, rpc, scValToNative } from "@/contracts/crowdfund-client";
import type { CampaignState, ContributionEvent, TxState } from "@/types";
import { decodeContributionEvents } from "@/utils/events";
import { mapTransactionError } from "@/utils/errors";

const MODULES = [new FreighterModule(), new xBullModule(), new AlbedoModule()];
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || networks.testnet.contractId;
const EVENTS_SERVER = new rpc.Server(RPC_URL);
const CACHE_KEY = "crowdfund_campaign";
const CACHE_TTL_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 30 * 1000;
const EVENT_LOOKBACK_LEDGERS = 5000;

interface CachedCampaign {
  data: CampaignState;
  cachedAt: number;
}

export interface CrowdfundContextValue {
  address: string | null;
  handleConnected: (addr: string) => void;
  disconnectWallet: () => void;
  campaign: CampaignState | null;
  campaignLoading: boolean;
  recentEvents: ContributionEvent[];
  txState: TxState;
  explorerUrl: string | null;
  contribute: (amount: number) => Promise<void>;
  claim: () => Promise<void>;
  refreshCampaign: () => Promise<void>;
  resetTx: () => void;
}

const CrowdfundContext = createContext<CrowdfundContextValue | null>(null);

function loadCached(): CampaignState | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedCampaign = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function saveCache(data: CampaignState) {
  try {
    const entry: CachedCampaign = { data, cachedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
  }
}

export function CrowdfundProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignState | null>(loadCached);
  const [campaignLoading, setCampaignLoading] = useState(!campaign);
  const [recentEvents, setRecentEvents] = useState<ContributionEvent[]>([]);
  const [txState, setTxState] = useState<TxState>({
    status: "idle",
    action: "contribute",
    hash: null,
    error: null,
  });
  const clientRef = useRef<Client | null>(null);
  const kitInitRef = useRef(false);

  useEffect(() => {
    if (kitInitRef.current) return;
    kitInitRef.current = true;
    StellarWalletsKit.init({
      modules: MODULES,
      network: Networks.TESTNET,
    });
  }, []);

  const refreshCampaign = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;

    setCampaignLoading(true);
    try {
      const { result } = await client.get_status();
      const data: CampaignState = {
        totalRaised: Number(result[0]),
        target: Number(result[1]),
        deadlineTimestamp: Number(result[2]),
        deadlinePassed: Number(result[3]) === 1,
        isClaimed: Number(result[4]) === 1,
      };
      setCampaign(data);
      saveCache(data);
    } catch (err) {
      console.error("Soroban Fetch Error:", err);
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {
      }
    } finally {
      setCampaignLoading(false);
    }
  }, []);

  /**
   * Event streaming: queries recent contract events from Soroban RPC and
   * decodes FundEvent contributions (topic[0] = "fund_event", topic[1] =
   * donor; data = [amount, total_raised, target]). Handles both the new
   * #[topic]/#[data] encoding and the legacy all-in-data encoding.
   */
  const refreshEvents = useCallback(async () => {
    try {
      const latest = await EVENTS_SERVER.getLatestLedger();
      const res = await EVENTS_SERVER.getEvents({
        startLedger: Math.max(latest.sequence - EVENT_LOOKBACK_LEDGERS, 1),
        filters: [{ type: "contract", contractIds: [CONTRACT_ID] }],
        limit: 10,
      });

      setRecentEvents(decodeContributionEvents(res.events, scValToNative));
    } catch (err) {
      console.error("Event stream error:", err);
    }
  }, []);

  useEffect(() => {
    if (!address) {
      clientRef.current = null;
      return;
    }

    const client = new Client({
      contractId: CONTRACT_ID,
      networkPassphrase: networks.testnet.networkPassphrase,
      rpcUrl: RPC_URL,
      publicKey: address,
      signTransaction: (xdr, opts) =>
        StellarWalletsKit.signTransaction(xdr, {
          networkPassphrase: opts?.networkPassphrase,
          address: opts?.address,
        }),
    });

    clientRef.current = client;
    // Defer the initial fetch out of the synchronous effect body to avoid
    // cascading renders (react-hooks/set-state-in-effect).
    const id = setTimeout(() => {
      refreshCampaign();
      refreshEvents();
    }, 0);
    return () => clearTimeout(id);
  }, [address, refreshCampaign, refreshEvents]);

  // Real-time updates: poll campaign status + events while connected.
  useEffect(() => {
    if (!address) return;
    const id = setInterval(() => {
      refreshCampaign();
      refreshEvents();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [address, refreshCampaign, refreshEvents]);

  const handleConnected = useCallback((addr: string) => {
    setAddress(addr);
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      await StellarWalletsKit.disconnect();
    } catch {
    }
    setAddress(null);
    setCampaign(null);
    setTxState({ status: "idle", action: "contribute", hash: null, error: null });
  }, []);

  const resetTx = useCallback(() => {
    setTxState({ status: "idle", action: "contribute", hash: null, error: null });
  }, []);

  const contribute = useCallback(
    async (amount: number) => {
      const client = clientRef.current;
      if (!client || !address) return;

      setTxState({ status: "awaiting_approval", action: "contribute", hash: null, error: null });

      try {
        const tx = await client.fund({ donor: address, amount });
        setTxState({ status: "validating", action: "contribute", hash: null, error: null });

        const sent = await tx.signAndSend();
        const hash = sent.sendTransactionResponse?.hash;

        if (!hash) throw new Error("No transaction hash returned");

        setTxState({ status: "success", action: "contribute", hash, error: null });
        await refreshCampaign();
        await refreshEvents();
      } catch (err: unknown) {
        const mapped = mapTransactionError(err);
        setTxState({ status: "failure", action: "contribute", hash: null, error: mapped.message });
      }
    },
    [address, refreshCampaign, refreshEvents]
  );

  const claim = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !address) return;

    setTxState({ status: "awaiting_approval", action: "claim", hash: null, error: null });

    try {
      const tx = await client.claim({ caller: address });
      setTxState({ status: "validating", action: "claim", hash: null, error: null });

      const sent = await tx.signAndSend();
      const hash = sent.sendTransactionResponse?.hash;

      if (!hash) throw new Error("No transaction hash returned");

      setTxState({ status: "success", action: "claim", hash, error: null });
      await refreshCampaign();
    } catch (err: unknown) {
      const mapped = mapTransactionError(err);
      setTxState({ status: "failure", action: "claim", hash: null, error: mapped.message });
    }
  }, [address, refreshCampaign]);

  const explorerUrl = txState.hash
    ? `https://stellar.expert/explorer/testnet/tx/${txState.hash}`
    : null;

  return (
    <CrowdfundContext.Provider
      value={{
        address,
        handleConnected,
        disconnectWallet,
        campaign,
        campaignLoading,
        recentEvents,
        txState,
        explorerUrl,
        contribute,
        claim,
        refreshCampaign,
        resetTx,
      }}
    >
      {children}
    </CrowdfundContext.Provider>
  );
}

export function useCrowdfund(): CrowdfundContextValue {
  const ctx = useContext(CrowdfundContext);
  if (!ctx) {
    throw new Error("useCrowdfund must be used within a CrowdfundProvider");
  }
  return ctx;
}
