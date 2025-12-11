# AeonDEX User Guide

Welcome to **AeonDEX**, a decentralized exchange (DEX) running on the **Arc Testnet**. This guide will walk you through every step of using the interface, from connecting your wallet to managing liquidity pools.

## 📋 Prerequisites

Before you begin, ensure you have:
1.  **A Web3 Wallet:** Installed extensions like **MetaMask** or **Rabby Wallet** in your browser.
2.  **Arc Testnet Configured:** The application will attempt to add this automatically, but you should be aware we operate on `Chain ID: 5042002`.
3.  **Test Tokens:** You will need **USDC** and **EURC** test tokens, plus **ETH** (on Arc) to pay for gas fees.

---

## 🔗 1. Connecting Your Wallet

To interact with AeonDEX, you must connect your wallet.

1.  Click the **"Connect Wallet"** button in the top right corner.
2.  Select your wallet provider (e.g., MetaMask) in the pop-up window.
3.  **Signature Request:** You may be asked to sign a message to verify ownership. Click **Sign**. This costs no gas.
4.  **Network Switch:** If you are not on the Arc Testnet, the app will automatically prompt you to switch networks. Click **"Switch Network"** or **"Approve"** in your wallet to confirm.

> **Mobile Users:** If you are on mobile, please use the built-in browser within your wallet app (MetaMask App > Browser) and paste the URL there.

---

## 🔄 2. Swapping Tokens

Exchange USDC for EURC (or vice versa) instantly.

1.  Navigate to the **"Swap"** tab.
2.  **Select Direction:** Click the small arrow button between the input fields or the currency button to toggle between selling **USDC** or **EURC**.
3.  **Enter Amount:** Type the amount you wish to swap in the "You Pay" field.
    * *Tip:* Click **MAX** to use your entire available balance.
4.  **Review Output:** The "You Receive" field will automatically calculate the estimated amount based on current reserves.
5.  **Approve & Swap:**
    * If this is your first time trading a token, you will be asked to **Approve** it first.
    * Once approved, click **"Swap Tokens"**.
6.  Confirm the transaction in your wallet. Wait for the green "Swap Successful" notification.

---

## 💧 3. Adding Liquidity (Pool)

Earn fees (0.3%) by providing liquidity to the pool.

1.  Navigate to the **"Pool"** tab.
2.  **Enter Amounts:** Input the amount of **USDC** and **EURC** you wish to deposit.
    * *Note:* You must provide both tokens.
3.  **The 3-Step Button Process:**
    The main button is intelligent and will guide you through the necessary approvals:
    * **Step A:** If the button says **"Approve USDC"**, click it and confirm in your wallet.
    * **Step B:** The button will change to **"Approve EURC"**. Click it and confirm.
    * **Step C:** Finally, the button will say **"Add Liquidity"**. Click it to deposit your tokens.
4.  Once confirmed, your "Your Position" panel will update immediately.

---

## 📉 4. Removing Liquidity

You can withdraw your tokens and accumulated fees at any time.

1.  Navigate to the **"Pool"** tab.
2.  Look for the **"Your Position"** panel. Here you can see:
    * **Your Shares (LP):** The precise amount of liquidity tokens you hold (displayed up to 18 decimal places).
    * **Total Withdrawable:** The current value of your position (Deposit + Fees earned).
3.  **Input Shares:** In the "Remove Liquidity" section, type the amount of shares you want to burn, or click **MAX** to withdraw everything.
4.  **Preview:** A box will appear showing exactly how much **USDC** and **EURC** you will receive back.
5.  Click **"Confirm Remove"** and approve the transaction in your wallet.

---

## ⚠️ Troubleshooting

* **"Wrong Network" Alert:** If you see a red banner, click the "Switch to Arc" button inside the alert.
* **Button is grayed out:** Ensure you have enough ETH for gas fees and that you have entered a valid amount (not zero).
* **Transaction Failed:** Check if you have sufficient slippage tolerance or if the network is busy. Try refreshing the page.

---

*Built by [BrNodes Dev Team](https://github.com/brnodes-dev)*