import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowRightLeft, 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  Loader2, 
  LogOut, 
  Info, 
  Database, 
  ExternalLink, 
  Github, 
  ArrowDown,
  Plus,
  Droplets,
  CheckCircle2,
  Smartphone,
  Copy,
  X,
  PieChart,
  ArrowDownCircle
} from 'lucide-react';
import { ethers } from 'ethers';

// --- CONFIGURAÇÃO DA REDE ARC ---
const ARC_CONFIG = {
  chainId: 5042002,
  chainIdHex: '0x4cef52',
  rpcUrl: "https://rpc.testnet.arc.network",
  explorerUrl: "https://testnet.arcscan.app",
  chainName: "Arc Testnet",
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }
};

// --- ENDEREÇOS DOS CONTRATOS ---
const CONTRACTS = {
  USDC: '0x3600000000000000000000000000000000000000',
  EURC: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
  AEON_DEX: '0x8667d4226C7c98AD959A3199B7241d97b21c08e7' 
};

// --- ABIs ---
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const DEX_ABI = [
  "function swap(address _tokenIn, uint256 _amountIn) external returns (uint256 amountOut)",
  "function addLiquidity(uint256 _amount0, uint256 _amount1) external returns (uint256)",
  "function removeLiquidity(uint256 _shares) external returns (uint256 amount0, uint256 amount1)",
  "function reserve0() view returns (uint256)",
  "function reserve1() view returns (uint256)",
  "function shares(address user) view returns (uint256)",
  "function totalShares() view returns (uint256)"
];

// --- ÍCONES ---
const USDCIcon = () => (
  <div className="w-5 h-5 rounded-full bg-[#2775CA] flex items-center justify-center text-white font-bold text-[10px] mr-2 shadow-sm">
    $
  </div>
);

const EURCIcon = () => (
  <div className="w-5 h-5 rounded-full bg-[#2775CA] flex items-center justify-center text-white font-bold text-[10px] mr-2 shadow-sm">
    €
  </div>
);

export default function AeonDEX() {
  // Estado UI
  const [activeTab, setActiveTab] = useState('swap');
  const [showMobileInstructions, setShowMobileInstructions] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  // Estado Web3
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);

  // Dados da Blockchain
  const [balances, setBalances] = useState({ usdc: '0.00', eurc: '0.00' });
  const [decimals, setDecimals] = useState({ usdc: 18, eurc: 18 });
  const [reserves, setReserves] = useState({ r0: 0, r1: 0 }); 
  
  // Dados de Liquidez/Rendimentos
  const [userShares, setUserShares] = useState('0'); 
  const [totalShares, setTotalShares] = useState('0'); 
  const [shareValue, setShareValue] = useState({ val0: '0.00', val1: '0.00' }); 
  
  // Inputs e Aprovações
  const [amountIn, setAmountIn] = useState('');
  const [tokenIn, setTokenIn] = useState('EURC'); 
  const [liquidityUSDC, setLiquidityUSDC] = useState('');
  const [liquidityEURC, setLiquidityEURC] = useState('');
  
  // ESTADO DE APROVAÇÃO
  const [needsApproval, setNeedsApproval] = useState({ usdc: false, eurc: false });
  
  // Remoção de Liquidez
  const [amountToRemove, setAmountToRemove] = useState(''); 
  const [removePreview, setRemovePreview] = useState({ usdc: '0.00', eurc: '0.00' }); 

  // Status de Processamento
  const [status, setStatus] = useState({ loading: false, msg: '' });

  // --- HELPER: Formatação de Shares (18 casas fixas) ---
  const formatShareDisplay = (valueStr) => {
    if (!valueStr) return '0.000000000000000000';
    const val = parseFloat(valueStr);
    if (val === 0) return '0.000000000000000000';
    return val.toFixed(18);
  };

  const formatBalance = (valueStr) => {
    if (!valueStr) return '0.00';
    const val = parseFloat(valueStr);
    if (val === 0) return '0.00';
    if (val < 0.01) return val.toFixed(6);
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  // --- CHECK ALLOWANCES ---
  const checkAllowances = useCallback(async () => {
      if (!account || !signer) return;
      
      try {
        const valUSDC = parseFloat(liquidityUSDC || '0');
        const valEURC = parseFloat(liquidityEURC || '0');
        
        let needUSDC = false;
        let needEURC = false;

        if (valUSDC > 0) {
            const usdcContract = new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, signer);
            const allowanceUSDC = await usdcContract.allowance(account, CONTRACTS.AEON_DEX);
            const amountWeiUSDC = ethers.parseUnits(liquidityUSDC, decimals.usdc);
            if (allowanceUSDC < amountWeiUSDC) needUSDC = true;
        }

        if (valEURC > 0) {
            const eurcContract = new ethers.Contract(CONTRACTS.EURC, ERC20_ABI, signer);
            const allowanceEURC = await eurcContract.allowance(account, CONTRACTS.AEON_DEX);
            const amountWeiEURC = ethers.parseUnits(liquidityEURC, decimals.eurc);
            if (allowanceEURC < amountWeiEURC) needEURC = true;
        }

        setNeedsApproval({ usdc: needUSDC, eurc: needEURC });

      } catch (e) {
          console.error("Error checking allowances", e);
      }
  }, [account, signer, liquidityUSDC, liquidityEURC, decimals]);

  // Executa verificação de allowance sempre que os inputs mudam
  useEffect(() => {
      const timer = setTimeout(() => {
          if(activeTab === 'pool') checkAllowances();
      }, 500); // Debounce
      return () => clearTimeout(timer);
  }, [checkAllowances, activeTab]);


  // --- EFFECT: Calcular Pré-visualização de Remoção ---
  useEffect(() => {
    if (!amountToRemove || !totalShares || parseFloat(totalShares) === 0 || parseFloat(amountToRemove) === 0) {
        setRemovePreview({ usdc: '0.00', eurc: '0.00' });
        return;
    }
    const sharesToRemoveNum = parseFloat(amountToRemove);
    const totalSharesNum = parseFloat(totalShares);
    const ratio = sharesToRemoveNum / totalSharesNum;

    const estimatedUSDC = (reserves.r0 * ratio).toFixed(6);
    const estimatedEURC = (reserves.r1 * ratio).toFixed(6);

    setRemovePreview({ usdc: estimatedUSDC, eurc: estimatedEURC });
  }, [amountToRemove, totalShares, reserves]);

  // --- UX HELPERS ---
  const showFeedback = (type, msg, duration = 4000) => {
      setFeedback({ type, message: msg });
      setTimeout(() => setFeedback(null), duration);
  };

  const copyUrl = () => {
      const url = window.location.href;
      if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(url).then(() => showFeedback('success', 'Link copied!'));
      } else {
          try {
            const textArea = document.createElement("textarea");
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showFeedback('success', 'Link copied!');
          } catch(e) {
            showFeedback('error', 'Failed to copy');
          }
      }
  };

  // --- GESTÃO DE REDE ---
  const switchNetwork = async () => {
    if(!window.ethereum) return;
    try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ARC_CONFIG.chainIdHex }],
        });
        setWrongNetwork(false);
    } catch (switchError) {
        if (switchError.code === 4902 || switchError.code === -32603) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CONFIG.chainIdHex,
                        chainName: ARC_CONFIG.chainName,
                        nativeCurrency: ARC_CONFIG.nativeCurrency,
                        rpcUrls: [ARC_CONFIG.rpcUrl],
                        blockExplorerUrls: [ARC_CONFIG.explorerUrl]
                    }],
                });
                setWrongNetwork(false);
            } catch (addError) { 
                console.error(addError);
                showFeedback('error', 'Failed to add network');
            }
        } else {
            showFeedback('error', 'Failed to switch network');
        }
    }
  };

  // --- INICIALIZAÇÃO ---
  useEffect(() => {
    const init = async () => {
      const isConnected = localStorage.getItem('isWalletConnected') === 'true';
      if (typeof window !== 'undefined' && window.ethereum && isConnected) {
        try {
          const _provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await _provider.listAccounts(); 
          
          if (accounts.length > 0) {
            const _signer = await _provider.getSigner();
            const _account = await _signer.getAddress();
            
            const network = await _provider.getNetwork();
            if (Number(network.chainId) !== ARC_CONFIG.chainId) setWrongNetwork(true);

            setProvider(_provider);
            setSigner(_signer);
            setAccount(_account);
            fetchData(_signer, _account);
          } else {
            localStorage.removeItem('isWalletConnected');
          }
        } catch (err) {
          console.error("Init Error:", err);
        }
      }
    };
    init();

    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accs) => {
            if (accs.length === 0) disconnectWallet();
            else window.location.reload();
        });
        window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, []);

  // --- CONEXÃO ---
  const connectWallet = async () => {
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobileDevice && !window.ethereum) {
        setShowMobileInstructions(true);
        return;
    }

    if (window.ethereum) {
      try {
        const _provider = new ethers.BrowserProvider(window.ethereum);
        const network = await _provider.getNetwork();
        
        if (Number(network.chainId) !== ARC_CONFIG.chainId) {
            setWrongNetwork(true);
            try { await switchNetwork(); } catch(e) {
                return showFeedback('error', 'Wrong Network. Please switch to Arc.');
            } 
        }

        await _provider.send("eth_requestAccounts", []);
        const _signer = await _provider.getSigner();
        
        const message = `Welcome to Aeon DEX!\n\nPlease sign this message to confirm ownership.\n\nTime: ${new Date().toLocaleString()}`;
        try {
            await _signer.signMessage(message);
        } catch (signErr) {
            console.warn("Signature skipped/failed", signErr);
        }

        const _account = await _signer.getAddress();
        localStorage.setItem('isWalletConnected', 'true');

        setProvider(_provider);
        setSigner(_signer);
        setAccount(_account);
        setWrongNetwork(false);
        showFeedback('success', 'Wallet Connected!');
        
        await fetchData(_signer, _account);

      } catch (error) {
        let msg = "Connection failed";
        if (error.reason) msg = error.reason;
        else if (error.message && error.message.includes("user rejected")) msg = "User rejected request";
        showFeedback('error', msg);
      }
    } else {
      window.open("https://metamask.io/download/", "_blank");
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setBalances({ usdc: '0.00', eurc: '0.00' });
    setUserShares('0');
    setTotalShares('0');
    localStorage.removeItem('isWalletConnected');
    showFeedback('info', 'Wallet Disconnected');
  };

  // --- BUSCAR DADOS ---
  const fetchData = async (_signer, _account) => {
      if (!_signer || !_account) return;
      try {
          const usdc = new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, _signer);
          const eurc = new ethers.Contract(CONTRACTS.EURC, ERC20_ABI, _signer);
          const dex = new ethers.Contract(CONTRACTS.AEON_DEX, DEX_ABI, _signer);
          
          const decUSDC = await usdc.decimals();
          const decEURC = await eurc.decimals();
          setDecimals({ usdc: Number(decUSDC), eurc: Number(decEURC) });

          const [balUSDC, balEURC, r0, r1, myShares, tShares] = await Promise.all([
              usdc.balanceOf(_account),
              eurc.balanceOf(_account),
              dex.reserve0(),
              dex.reserve1(),
              dex.shares(_account),
              dex.totalShares()
          ]);

          const r0Formatted = parseFloat(ethers.formatUnits(r0, decUSDC));
          const r1Formatted = parseFloat(ethers.formatUnits(r1, decEURC));
          const mySharesFormatted = ethers.formatEther(myShares);
          const tSharesFormatted = ethers.formatEther(tShares);
          
          const mySharesNum = parseFloat(mySharesFormatted);
          const totalSharesNum = parseFloat(tSharesFormatted);

          setBalances({
              usdc: ethers.formatUnits(balUSDC, decUSDC),
              eurc: ethers.formatUnits(balEURC, decEURC)
          });

          setReserves({ r0: r0Formatted, r1: r1Formatted });
          setUserShares(mySharesFormatted); 
          setTotalShares(tSharesFormatted);

          if (totalSharesNum > 0 && mySharesNum > 0) {
              const sharePercent = mySharesNum / totalSharesNum;
              const myValue0 = (r0Formatted * sharePercent).toFixed(4);
              const myValue1 = (r1Formatted * sharePercent).toFixed(4);
              setShareValue({ val0: myValue0, val1: myValue1 });
          } else {
              setShareValue({ val0: '0.00', val1: '0.00' });
          }

      } catch (e) {
          console.error("Fetch Error:", e);
      }
  };

  // --- SWAP ---
  const handleSwap = async () => {
      if (!signer || !amountIn) return;
      setStatus({ loading: true, msg: 'Initializing Swap...' });

      try {
          const decimalsIn = tokenIn === 'USDC' ? decimals.usdc : decimals.eurc;
          const amountWei = ethers.parseUnits(amountIn, decimalsIn);
          
          const tokenInAddr = tokenIn === 'USDC' ? CONTRACTS.USDC : CONTRACTS.EURC;
          const tokenContract = new ethers.Contract(tokenInAddr, ERC20_ABI, signer);
          const dexContract = new ethers.Contract(CONTRACTS.AEON_DEX, DEX_ABI, signer);

          setStatus({ loading: true, msg: `Approving ${tokenIn}...` });
          const allowance = await tokenContract.allowance(account, CONTRACTS.AEON_DEX);
          
          if (allowance < amountWei) {
              const tx = await tokenContract.approve(CONTRACTS.AEON_DEX, amountWei);
              await tx.wait();
          }

          setStatus({ loading: true, msg: 'Executing Swap...' });
          const txSwap = await dexContract.swap(tokenInAddr, amountWei);
          await txSwap.wait();

          showFeedback('success', 'Swap Successful!');
          setAmountIn('');
          await fetchData(signer, account);

      } catch (e) {
          console.error(e);
          showFeedback('error', 'Swap Failed');
      } finally {
          setStatus({ loading: false, msg: '' });
      }
  };

  // --- LOGICA DE BOTÃO "ADD LIQUIDITY" INTELIGENTE ---
  const handleLiquidityAction = async () => {
      if (!signer || !liquidityUSDC || !liquidityEURC) return;

      // 1. Aprovar USDC se necessário
      if (needsApproval.usdc) {
          try {
              setStatus({ loading: true, msg: 'Approving USDC...' });
              const usdcContract = new ethers.Contract(CONTRACTS.USDC, ERC20_ABI, signer);
              const amtUSDC = ethers.parseUnits(liquidityUSDC, decimals.usdc);
              const tx = await usdcContract.approve(CONTRACTS.AEON_DEX, amtUSDC);
              await tx.wait();
              
              showFeedback('success', 'USDC Approved');
              await checkAllowances(); 
          } catch (e) {
              console.error(e);
              showFeedback('error', 'USDC Approval Failed');
          } finally {
              setStatus({ loading: false, msg: '' });
          }
          return;
      }

      // 2. Aprovar EURC se necessário
      if (needsApproval.eurc) {
          try {
              setStatus({ loading: true, msg: 'Approving EURC...' });
              const eurcContract = new ethers.Contract(CONTRACTS.EURC, ERC20_ABI, signer);
              const amtEURC = ethers.parseUnits(liquidityEURC, decimals.eurc);
              const tx = await eurcContract.approve(CONTRACTS.AEON_DEX, amtEURC);
              await tx.wait();
              
              showFeedback('success', 'EURC Approved');
              await checkAllowances();
          } catch (e) {
              console.error(e);
              showFeedback('error', 'EURC Approval Failed');
          } finally {
              setStatus({ loading: false, msg: '' });
          }
          return;
      }

      // 3. Adicionar Liquidez
      try {
          setStatus({ loading: true, msg: 'Adding Liquidity...' });
          const dexContract = new ethers.Contract(CONTRACTS.AEON_DEX, DEX_ABI, signer);
          
          const amtUSDC = ethers.parseUnits(liquidityUSDC, decimals.usdc);
          const amtEURC = ethers.parseUnits(liquidityEURC, decimals.eurc);

          const tx = await dexContract.addLiquidity(amtUSDC, amtEURC);
          await tx.wait();

          showFeedback('success', 'Liquidity Added!');
          setLiquidityUSDC('');
          setLiquidityEURC('');
          await fetchData(signer, account);
          await checkAllowances();

      } catch (e) {
          console.error(e);
          showFeedback('error', 'Failed to Add Liquidity');
      } finally {
          setStatus({ loading: false, msg: '' });
      }
  };

  const getLiquidityButtonText = () => {
      if (!account) return 'Connect Wallet';
      if (status.loading) return status.msg;
      if (!liquidityUSDC || !liquidityEURC) return 'Enter Amount';
      
      if (needsApproval.usdc) return 'Approve USDC';
      if (needsApproval.eurc) return 'Approve EURC';
      
      return 'Add Liquidity';
  };


  // --- REMOVER LIQUIDEZ ---
  const handleRemoveLiquidity = async () => {
      if (!signer || !amountToRemove) return;
      setStatus({ loading: true, msg: 'Removing Liquidity...' });

      try {
          const dexContract = new ethers.Contract(CONTRACTS.AEON_DEX, DEX_ABI, signer);
          const sharesWei = ethers.parseUnits(amountToRemove, 18);

          if (parseFloat(amountToRemove) > parseFloat(userShares)) {
               showFeedback('error', 'Insufficient Shares Balance');
               setStatus({ loading: false, msg: '' });
               return;
          }

          setStatus({ loading: true, msg: 'Confirm in Wallet...' });
          const tx = await dexContract.removeLiquidity(sharesWei);
          await tx.wait();

          showFeedback('success', 'Liquidity Removed!');
          setAmountToRemove('');
          setRemovePreview({ usdc: '0.00', eurc: '0.00' });
          await fetchData(signer, account);

      } catch (e) {
          console.error(e);
          showFeedback('error', 'Failed to Remove');
      } finally {
          setStatus({ loading: false, msg: '' });
      }
  };

  // --- CÁLCULO DE SAÍDA SWAP ---
  const calculateOutput = () => {
      if (!amountIn || reserves.r0 === 0) return '0.00';
      const val = parseFloat(amountIn);
      const fee = val * 0.997; 
      
      if (tokenIn === 'USDC') {
          return ((reserves.r1 * fee) / (reserves.r0 + fee)).toFixed(6);
      } else {
          return ((reserves.r0 * fee) / (reserves.r1 + fee)).toFixed(6);
      }
  };

  const toggleDirection = () => {
      setTokenIn(prev => prev === 'USDC' ? 'EURC' : 'USDC');
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans p-4 md:p-8 flex justify-center selection:bg-purple-500 selection:text-white pb-20 relative">
      
      {/* --- HEADER --- */}
      <nav className="fixed top-0 left-0 right-0 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md z-50 h-20">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between relative">
          
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-purple-500 to-pink-500 p-2 rounded-lg shadow-lg">
                <ArrowRightLeft className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl text-white tracking-tight">Aeon<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">DEX</span></span>
          </div>
          
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-2 bg-emerald-900/30 border border-emerald-500/30 px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]">
             <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]"></div>
             <span className="text-emerald-400 text-xs font-bold tracking-widest uppercase">Live on Arc Testnet</span>
          </div>

          <div className="flex items-center gap-3">
             {account ? (
                 <div className="flex items-center gap-2">
                     <span className="px-4 py-2 rounded-full text-sm font-medium border border-slate-800 bg-slate-900 text-slate-300 font-mono hidden sm:block">
                        {account.substring(0,6)}...{account.substring(38)}
                     </span>
                     <button onClick={disconnectWallet} className="p-2 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Disconnect">
                        <LogOut size={20}/>
                     </button>
                 </div>
             ) : (
                 <button onClick={connectWallet} className="px-6 py-2.5 rounded-full text-sm font-bold bg-white text-slate-950 hover:bg-slate-200 shadow-lg transition-colors flex items-center gap-2">
                    <Wallet size={16}/> Connect Wallet
                 </button>
             )}
          </div>
        </div>
      </nav>

      {/* FEEDBACK TOAST */}
      {feedback && (
        <div className={`fixed top-24 right-4 px-6 py-4 rounded-xl border flex items-center gap-3 z-[100] shadow-2xl animate-in slide-in-from-right fade-in duration-300 ${feedback.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' : 'bg-red-950/90 border-red-500/50 text-red-200'}`}>
            {feedback.type === 'success' ? <CheckCircle2 size={20}/> : <Info size={20}/>}
            <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* MOBILE INSTRUCTIONS MODAL */}
      {showMobileInstructions && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-center">
                  <button onClick={() => setShowMobileInstructions(false)} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"><X size={24} /></button>
                  <div className="bg-purple-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/20"><Smartphone className="w-8 h-8 text-purple-400"/></div>
                  <h3 className="text-xl font-bold text-white mb-2">Connect Mobile Wallet</h3>
                  <p className="text-zinc-400 text-sm mb-6 leading-relaxed">Aeon DEX works best inside your wallet's built-in browser (MetaMask, Rabby, etc).</p>
                  <button onClick={copyUrl} className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-xl flex items-center justify-center gap-3 transition-all font-bold text-white shadow-lg shadow-purple-900/30"><Copy size={20}/> Copy Website Link</button>
                  <div className="mt-4 text-center text-xs text-zinc-500">1. Copy Link above<br/>2. Open MetaMask or Rabby App<br/>3. Paste in the internal Browser</div>
              </div>
          </div>
      )}

      {/* WRONG NETWORK ALERT */}
      {wrongNetwork && (
          <div className="fixed bottom-24 right-4 lg:bottom-auto lg:top-24 lg:left-1/2 lg:-translate-x-1/2 z-[100] p-4 bg-red-500/90 backdrop-blur border border-red-400 rounded-xl flex items-center gap-4 shadow-2xl animate-bounce">
              <div className="flex items-center gap-2 text-white">
                  <AlertTriangle className="w-5 h-5"/>
                  <span className="font-bold">Wrong Network</span>
              </div>
              <button onClick={switchNetwork} className="bg-white text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100">Switch to Arc</button>
          </div>
      )}

      {/* CONTAINER PRINCIPAL */}
      <div className="max-w-xl w-full relative mt-32">
        
        {/* ABAS */}
        <div className="flex justify-center gap-2 mb-6 bg-slate-900/50 p-1 rounded-full w-fit mx-auto border border-slate-800">
            <button onClick={() => setActiveTab('swap')} className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${activeTab === 'swap' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'text-slate-400 hover:text-white'}`}>Swap</button>
            <button onClick={() => setActiveTab('pool')} className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${activeTab === 'pool' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'text-slate-400 hover:text-white'}`}>Pool</button>
        </div>

        {/* CARTÃO */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            
            {activeTab === 'swap' ? (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Swap Tokens</h2>
                        <span className="text-xs bg-slate-950 px-2 py-1 rounded text-slate-500 border border-slate-800">Slippage: Auto</span>
                    </div>

                    {/* INPUT */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 hover:border-purple-500/30 transition-colors">
                        <div className="flex justify-between text-xs text-slate-500 mb-2">
                            <span>You Pay</span>
                            <span className="flex items-center gap-1">
                                Balance: {formatBalance(tokenIn === 'USDC' ? balances.usdc : balances.eurc)}
                                {account && <button onClick={() => setAmountIn(tokenIn === 'USDC' ? balances.usdc : balances.eurc)} className="text-purple-400 font-bold hover:text-purple-300 ml-1">MAX</button>}
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <input type="number" value={amountIn} onChange={e => setAmountIn(e.target.value)} placeholder="0.00" className="w-full bg-transparent text-3xl font-bold outline-none text-white placeholder-slate-700"/>
                            <button onClick={toggleDirection} className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-700 transition-colors shrink-0">
                                {tokenIn === 'USDC' ? <><USDCIcon/> USDC</> : <><EURCIcon/> EURC</>}
                            </button>
                        </div>
                    </div>

                    {/* BOTÃO DE INVERTER DIREÇÃO */}
                    <div className="flex justify-center -my-3 relative z-10">
                        <button 
                            onClick={toggleDirection}
                            className="bg-slate-900 p-2 rounded-xl border border-slate-800 text-slate-500 hover:text-white hover:border-purple-500 transition-all active:scale-95 shadow-md"
                            title="Switch Direction"
                        >
                            <ArrowDown size={18}/>
                        </button>
                    </div>

                    {/* OUTPUT */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                        <div className="flex justify-between text-xs text-slate-500 mb-2">
                            <span>You Receive (Estimated)</span>
                            <span>Balance: {formatBalance(tokenIn === 'USDC' ? balances.eurc : balances.usdc)}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <input type="text" readOnly value={calculateOutput()} className="w-full bg-transparent text-3xl font-bold outline-none text-emerald-400 placeholder-slate-700"/>
                            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 shrink-0">
                                {tokenIn === 'USDC' ? <><EURCIcon/> EURC</> : <><USDCIcon/> USDC</>}
                            </div>
                        </div>
                    </div>

                    {/* TRANSPARENCY NOTE (ATUALIZADO) */}
                    <div className="mt-4 p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 flex items-center gap-1">Liquidity Provider Fee <Info size={12}/></span>
                            <span className="text-white font-bold">0.30%</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-3 pt-3 border-t border-purple-500/10 leading-relaxed">
                            <span className="text-purple-400 font-bold">Aeon Transparency:</span> All swaps are executed directly on the Arc Blockchain via the AeonDEX smart contract. Fees are distributed to liquidity providers.
                        </p>
                    </div>

                    <button onClick={handleSwap} disabled={status.loading || !account} className={`w-full mt-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-purple-900/30 transition-all flex items-center justify-center gap-2 ${status.loading || !account ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}>
                        {status.loading ? <><Loader2 className="animate-spin"/> {status.msg}</> : !account ? 'Connect Wallet' : 'Swap Tokens'}
                    </button>
                </>
            ) : (
                <>
                    {/* POOL TAB */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Liquidity Pool</h2>
                        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-500/20">
                            <Droplets size={12}/> Earn 0.3% Fees
                        </div>
                    </div>

                    {/* --- PAINEL DE RENDIMENTOS E POSIÇÃO --- */}
                    <div className="mb-6 p-5 bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-700 shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                        
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2 relative z-10">
                            <PieChart size={18} className="text-purple-400"/> Your Position
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Your Shares (LP)</p>
                                <p className="text-xs font-mono text-white break-all tracking-tight leading-tight">
                                    {formatShareDisplay(userShares)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Total Withdrawable</p>
                                <div className="text-xs font-bold text-emerald-400">
                                    <p>{shareValue.val0} USDC</p>
                                    <p>{shareValue.val1} EURC</p>
                                </div>
                            </div>
                        </div>

                        {/* REMOVE LIQUIDITY INPUT */}
                        {parseFloat(userShares) > 0 && (
                            <div className="pt-4 border-t border-slate-800 relative z-10">
                                <div className="flex justify-between text-xs text-slate-500 mb-2">
                                    <label>Remove Liquidity (Shares)</label>
                                    <button onClick={() => setAmountToRemove(userShares)} className="text-purple-400 font-bold hover:text-purple-300">MAX</button>
                                </div>
                                
                                <div className="flex gap-2 mb-2">
                                    <input 
                                        type="number" 
                                        value={amountToRemove} 
                                        onChange={e => setAmountToRemove(e.target.value)} 
                                        placeholder="0.00" 
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:border-purple-500 transition-colors"
                                    />
                                </div>

                                {/* PREVIEW DE SAÍDA */}
                                {amountToRemove && parseFloat(amountToRemove) > 0 && (
                                    <div className="mb-3 p-2 bg-emerald-950/20 border border-emerald-500/20 rounded-lg flex items-center justify-between text-xs animate-in fade-in">
                                        <span className="text-emerald-200 flex items-center gap-1"><ArrowDownCircle size={12}/> You receive:</span>
                                        <div className="text-right">
                                            <div className="font-bold text-white">{removePreview.usdc} USDC</div>
                                            <div className="font-bold text-white">{removePreview.eurc} EURC</div>
                                        </div>
                                    </div>
                                )}

                                <button 
                                    onClick={handleRemoveLiquidity}
                                    disabled={status.loading || !amountToRemove}
                                    className="w-full bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors font-bold whitespace-nowrap text-sm flex items-center justify-center gap-2"
                                >
                                    {status.loading ? <><Loader2 size={14} className="animate-spin"/> Processing</> : 'Confirm Remove'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* POOL RESERVES */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total USDC</p>
                            <p className="text-sm font-mono font-bold text-white">{reserves.r0.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total EURC</p>
                            <p className="text-sm font-mono font-bold text-white">{reserves.r1.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* ADD LIQUIDITY INPUTS */}
                    <h3 className="text-sm font-bold text-slate-400 mb-3 mt-6">Add Liquidity</h3>
                    <div className="space-y-0">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                            <div className="flex justify-between text-xs text-slate-500 mb-2">
                                <label>Deposit USDC</label>
                                <span className="flex items-center gap-1">
                                    Balance: {formatBalance(balances.usdc)}
                                    {account && <button onClick={() => setLiquidityUSDC(balances.usdc)} className="text-purple-400 font-bold hover:text-purple-300 ml-1">MAX</button>}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <input type="number" value={liquidityUSDC} onChange={e => setLiquidityUSDC(e.target.value)} className="w-full bg-transparent outline-none text-white font-bold text-xl placeholder-slate-700" placeholder="0.00"/>
                                <span className="text-sm font-bold text-slate-400">USDC</span>
                            </div>
                        </div>

                        {/* Centralized Plus Sign */}
                        <div className="flex justify-center -my-3 relative z-10">
                            <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 shadow-sm">
                                <Plus size={18} className="text-slate-500"/>
                            </div>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                            <div className="flex justify-between text-xs text-slate-500 mb-2">
                                <label>Deposit EURC</label>
                                <span className="flex items-center gap-1">
                                    Balance: {formatBalance(balances.eurc)}
                                    {account && <button onClick={() => setLiquidityEURC(balances.eurc)} className="text-purple-400 font-bold hover:text-purple-300 ml-1">MAX</button>}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <input type="number" value={liquidityEURC} onChange={e => setLiquidityEURC(e.target.value)} className="w-full bg-transparent outline-none text-white font-bold text-xl placeholder-slate-700" placeholder="0.00"/>
                                <span className="text-sm font-bold text-slate-400">EURC</span>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleLiquidityAction} 
                        disabled={status.loading || !account || (!liquidityUSDC && !liquidityEURC)} 
                        className={`w-full mt-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-lg border border-slate-700 transition-all flex items-center justify-center gap-2 ${(status.loading || !account) ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                    >
                        {status.loading ? <><Loader2 className="animate-spin"/> {status.msg}</> : getLiquidityButtonText()}
                    </button>
                </>
            )}

        </div>

        {/* FOOTER */}
        <div className="fixed bottom-0 left-0 right-0 p-2 text-[10px] text-center text-slate-600 bg-[#020617]/90 backdrop-blur flex justify-center gap-4 z-50">
           <span>Network: {ARC_CONFIG.chainName}</span>
           <a 
             href={`https://testnet.arcscan.app/address/${CONTRACTS.AEON_DEX}`} 
             target="_blank" 
             rel="noopener noreferrer"
             className="hover:text-purple-400 transition-colors underline decoration-slate-700 hover:decoration-purple-400 flex items-center gap-1"
           >
              View Contract on ArcScan <ExternalLink size={10} />
           </a>
           
           <a 
             href="https://github.com/brnodes-dev/aeondex" 
             target="_blank" 
             rel="noopener noreferrer"
             className="hover:text-purple-400 transition-colors underline decoration-slate-700 hover:decoration-purple-400 flex items-center gap-1"
           >
              User Guide <Github size={10} />
           </a>
        </div>

      </div>
    </div>
  );
}