# 🍳 Kitchen Expense Tracker

A mobile-first, responsive web application for a small cloud kitchen to track daily grocery & ingredient purchases and compare them against 1-2 week delivery channel payouts to track real profit and loss.

---

## 🌟 Key Features

1. **Quick Daily Expense Entry (Mobile FAB & Keypad Friendly)**
   - Date (defaults to today)
   - Item name with quick autocomplete suggestion chips (e.g. Tomatoes, Chicken, Oil, Packaging, Gas)
   - Category selection with custom color badges and icons
   - Amount in configured currency (default: **PKR**)
   - Optional quantity + unit (`kg`, `litre`, `pcs`, `packet`, `dozen`, `box`, `gm`, `ml`)
   - Optional vendor/shop (e.g. *Sabzi Mandi*, *Tariq Poultry*, *Metro*)
   - Optional notes

2. **Payout & Profit/Loss Comparison**
   - Record payouts received from delivery platforms (Foodpanda, catering, etc.)
   - Specify the exact **period covered** (e.g. Oct 1 – Oct 7)
   - The app automatically calculates all kitchen expenses incurred in that exact period and computes:
     $$\text{Net Profit/Loss} = \text{Payout Amount} - \text{Total Kitchen Expenses}$$
     with a clear profit margin badge.

3. **Views with Flexible Totals**
   - **Today**, **This Week**, **This Month**, and **Custom Date Range** (crucial for bi-weekly payout cycles).
   - Instant live search by item name, vendor, or note.
   - Filter by category with live total spend aggregation.

4. **Summary Dashboard & Visual Charts**
   - Total spent, total payouts, net profit/loss, daily average spend.
   - Interactive **Category Breakdown Donut Chart** with percentage shares.
   - Interactive **Daily Spending Trend Chart** to spot spend spikes.
   - Recent purchases quick list.

5. **No Passwords or Screen Locks (Single User Fast Access)**
   - Direct, instant access from your phone or laptop with zero login prompts or lock screens.

6. **Backup & Excel Export**
   - One-click **CSV Export** with UTF-8 BOM (opens properly in Microsoft Excel without character corruption).
   - One-click **SQLite Database Backup** download (`kitchen_backup_YYYY-MM-DD.db`).
   - One-click **Clear Data** in Settings if you ever want to reset all records to zero.

---

## 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite with `better-sqlite3` (WAL mode enabled, persistent file at `data/kitchen.db`)
- **Frontend**: Mobile-first vanilla HTML5, CSS3, and JavaScript (snappy, no heavy frontend frameworks, instant load)
- **Networking**: Configured to bind on `0.0.0.0:3000` for seamless local Wi-Fi sharing.

---

## 🚀 How to Install and Run

### 1. Prerequisites
Ensure [Node.js](https://nodejs.org/) (v18 or higher) is installed on your computer.

### 2. Install Dependencies
Open PowerShell or your terminal in this folder:
```powershell
npm install
```

### 3. Start the Server
```powershell
npm start
```
*(Or `node server.js`)*

When the server starts, you will see output like this:
```
======================================================
  🍳  KITCHEN EXPENSE TRACKER IS ONLINE
======================================================
  Local:            http://localhost:3000
  On your Wi-Fi:    http://192.168.31.100:3000
  Mode:             Single User (Screen Lock Disabled)
======================================================
```

---

## 📱 How to Open the App on Your Phone (Same Wi-Fi)

1. Make sure your phone and your PC are connected to the **same Wi-Fi network**.
2. Note your PC's IP address printed in the terminal (e.g. `192.168.31.100`) or find it manually:
   - On Windows: Open PowerShell or Command Prompt, run `ipconfig`, and look for `IPv4 Address` under your Wi-Fi adapter.
3. Open Safari, Chrome, or any browser on your phone.
4. Type in the address:
   ```
   http://YOUR_PC_IP:3000
   ```
   *(For example: `http://192.168.31.100:3000`)*
5. The app opens immediately without any PIN prompt!
6. **📱 Pro Tip (Add to Home Screen)**:
   - **iPhone (Safari)**: Tap the Share button at the bottom -> tap **"Add to Home Screen"**.
   - **Android (Chrome)**: Tap the 3 dots menu at top right -> tap **"Add to Home screen"** or **"Install app"**.
   - This turns it into a full-screen, standalone app on your phone!

---

## 🗄️ Database & Backups

- The database file is located at `data/kitchen.db`.
- **Automatic Persistence**: All data is automatically saved to disk and survives restarts.
- **Default Categories Ready**: Includes 8 ready-to-use kitchen categories (*Vegetables, Meat/Chicken, Oil & Ghee, Spices, Dairy, Packaging, Gas/Fuel, Other*). You can also add custom categories anytime.
- **How to Backup**:
  - Go to the **⚙️ Settings** tab and click **"📦 Download Database Backup (.db)"**.
  - Or manually copy `data/kitchen.db` to a flash drive or cloud storage.
  - Or click **"📊 Export All Records as CSV"** to get an Excel spreadsheet.

---

## ⚙️ Settings

- Open the **⚙️ Settings** tab in the app:
  - **Kitchen Name**: Change your cloud kitchen's name.
  - **Currency**: Switch between `PKR`, `USD`, `EUR`, `AED`, `SAR`, etc.
  - **Wi-Fi Link**: View your phone connection link with a 1-click **Copy Link** button.
  - **Clear Data**: Quick button to wipe expenses and payouts back to zero if needed.
