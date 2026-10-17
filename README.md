# Tampermonkey: Steam info scraper

> **已停止維護（2026-10-18）**：功能已由 [game-watchlist-keeper](https://github.com/YiFanChen99/game-watchlist-keeper) 的 `packages/userscript-steam`（Ekko Steam Sheet Writer）取代：按下按鈕就直接新增或更新 Sheet 的那一列，不再經過剪貼簿。本 repo 已封存。這支腳本不會自動換成新版，請先移除，再安裝 <https://yifanchen99.github.io/game-watchlist-keeper/steam/Script.user.js>。

## Features

在 Steam 商店頁加上按鈕，一鍵擷取遊戲資訊，以 tab 分隔的格式存進剪貼簿，方便直接貼進試算表的一列。

- 基本資訊：標題、原價、史低折扣、發售日、評價、今天日期
- 細節資訊：搶先體驗註記、中文支援程度、評論中的遊玩時數

## Installation

1. Install [Violentmonkey](https://addons.mozilla.org/en-us/firefox/addon/violentmonkey/) (Firefox) or [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) (Chrome) / [Tampermonkey](https://addons.opera.com/en/extensions/details/tampermonkey-beta/) (Opera).
2. Open `https://github.com/YiFanChen99/tampermonkey--steam-info-scraper/raw/main/Script.user.js` or click [here](https://github.com/YiFanChen99/tampermonkey--steam-info-scraper/raw/main/Script.user.js)
3. Click `Install`.

## Usage

### Requirements

- Steam 介面語言設為**繁體中文**：搶先體驗與語言支援是比對中文字樣判斷的。
- 安裝 SteamDB 擴充套件：史低價格取自它在商店頁加上的區塊。
- 細節資訊的評論是取頁面上**已載入**評論的時數，故要先往下捲到評論區讓評論載入再按。

### Buttons

開啟任一商店頁（`store.steampowered.com/app/*`），右上角會出現三個按鈕：

| 按鈕 | 複製內容 |
| --- | --- |
| `Parse info` | 基本資訊，適合新增一列 |
| `(!title)` | 同上但不含標題欄，適合更新已存在的列 |
| `detail` | 細節資訊，單一儲存格 |

按下後到試算表選好起始儲存格，直接貼上即可。

<!-- TODO: ## Development -->
<!-- TODO: ### Build & Deploy -->
<!-- TODO: ### Architecture -->
