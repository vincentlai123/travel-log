# Vincent 旅遊日誌：Grok Bot 與 Codex 協作指南

這份說明給 **Codex（使用者 Windows 電腦）** 與 **Grok Bot（box）** 共用，讓兩邊都能更新網站並保持同步。可公開，**不含密碼與明文資料**。

兩邊用哪一個都可以，但必須遵守同一套規則：

1. **GitHub 上的 `data.enc.json` 是唯一共同資料來源。**
2. **明文 `data.json`、圖片、密碼檔絕不可 commit 或 push 到 GitHub。**
3. 每次動手都走：**先 `git pull` → 解密 → 編輯 → `build` → 只提交加密檔與本說明允許的文件 → `push`。**

Windows 端可另用 [WINDOWS_協作接續.md](WINDOWS_協作接續.md) 的本機密碼視窗與 Node 加解密工具（與 Python 格式相同、不需額外套件）。該文件也規範 Git 傳輸受限時使用已授權 GitHub 連線的最新版本與衝突檢查流程；密碼仍只留本機。

---

## 一、網址

- 網站（手機版，開站要輸入密碼）：https://vincentlai123.github.io/travel-log/
- GitHub repo：https://github.com/vincentlai123/travel-log
- 本指南在 repo 的位置：https://github.com/vincentlai123/travel-log/blob/main/CODEX_協作指南.md

密碼請向 **Vincent** 拿（與手機網站解鎖密碼同一組）。**不要把密碼寫進任何會被 git 追蹤的檔案，也不要寫進聊天、commit message 或本指南。**

---

## 二、本機首次設定（Windows / Codex）

### 需要的軟體

- Git
- Python 3.10 或更新（PowerShell 裡 `python --version` 能跑即可；若只有 `py`，下文的 `python` 改成 `py`）

### 步驟（PowerShell）

```powershell
# 1. 複製 repo
git clone https://github.com/vincentlai123/travel-log.git
cd travel-log

# 2. 安裝加解密套件
python -m pip install -r requirements.txt

# 3. 向 Vincent 拿密碼後，寫入本機檔（單行、不要加引號）
New-Item -ItemType Directory -Force "$env:USERPROFILE\.config" | Out-Null
notepad "$env:USERPROFILE\.config\travel-log-pass"
# 存檔關閉。內容只有密碼本身。
# 若編輯器加了 UTF-8 BOM 或行尾換行，腳本會自動去掉，一般沒問題。

# 4. 解密出本機工作檔（會產生 data.json，已被 .gitignore，不會進 Git）
python decrypt.py
```

密碼也可改用環境變數（較容易進指令紀錄，比較不建議常駐）：

```powershell
$env:TRAVEL_LOG_PASS = "請向 Vincent 拿的那組密碼"
```

或指定密碼檔路徑：

```powershell
$env:TRAVEL_LOG_PASS_FILE = "C:\Users\<你的帳號>\.config\travel-log-pass"
```

讀取順序：`TRAVEL_LOG_PASS` → `TRAVEL_LOG_PASS_FILE` → `%USERPROFILE%\.config\travel-log-pass` → repo 裡的 `.travel-log-pass`（此檔也已在 `.gitignore`）。

Linux / box 預設密碼檔是 `~/.config/travel-log-pass`。明文資料在 box 上預設寫到 `/home/box/shared/旅遊日誌/data.json`；Windows 則寫到 repo 目錄的 `data.json`。可用環境變數 `TRAVEL_LOG_DATA`、`TRAVEL_LOG_ENC` 覆寫路徑。

---

## 三、資料是怎麼放的（含圖片）

| 檔案 | 在哪裡 | 能否上 GitHub |
| --- | --- | --- |
| `data.enc.json` | repo / 網站 | **唯一**可提交的資料檔 |
| `index.html`、`build.py`、`decrypt.py`、本指南、`CHANGELOG.md` | repo | 可以 |
| 本機 `data.json` | 解密後的工作檔 | **不行** |
| 本機 `圖片/` | 工作用附件 | **不行** |
| 密碼檔 / 環境變數 | 只在本機 | **不行** |

`build.py` 用 AES-GCM，金鑰由密碼經 PBKDF2-SHA256（20 萬次）衍生，把整份 `data.json` 加密成 `data.enc.json`。網站 `index.html` 在瀏覽器請使用者輸入同一組密碼後，於本機解密 `data.enc.json` 再顯示。

**圖片目前不會進網站。** `data.json` 雖有 `圖片` 欄（例如 `圖片/108_麵屋花火林森店.jpg`），但 `index.html` 不會渲染照片，repo 也不存放圖片檔。照片只留在各端本機資料夾：

- box：`/home/box/shared/旅遊日誌/圖片/`
- Windows：建議放在 repo 旁的 `圖片/`（已被 `.gitignore`）

兩邊不會自動拿到對方新增的圖。若要給對方備份，請用私人管道傳檔，**不要把明文照片 commit 上去**。也不要把照片 base64 進 `data.json` 後再加密上庫，除非 Vincent 另行決定改格式。

---

## 四、data.json 欄位規格

頂層結構：

```json
{
  "說明": "Vincent 的旅遊日誌。類別：食衣住行育樂；地區：台灣(北/中/南/東/離島 + 縣市) 或 國外(國家/城市)。",
  "entries": [ ]
}
```

每筆必要欄位：`id`, `類別`, `子類`, `名稱`, `區域`, `分區`, `縣市`, `地點`, `地址`, `電話`, `營業時間`, `備註`, `來源`, `圖片`, `加入日期`。

選填：

- `專題`：字串陣列，例如 `["麵類"]`、`["美國運通"]`，可並存 `["麵類","美國運通"]`。沒有專題就省略此欄，或給空陣列。
- 偶爾使用 `官網`、`訂位`（網站會顯示連結）。

已停用：`標籤` / `tags`（美國運通改記在 `專題`）。

寫入時用 UTF-8，`ensure_ascii=False`，建議 `indent=1`。沒有電話或圖片時，對應欄位留空字串 `""`，不要刪掉欄位、也不要捏造。

範例：

```json
{
  "id": 21,
  "類別": "樂",
  "子類": "景點／湖景步道",
  "名稱": "大湖風景特定區（員山天鵝湖）",
  "區域": "台灣",
  "分區": "東",
  "縣市": "宜蘭縣",
  "地點": "員山鄉（湖北村）",
  "地址": "宜蘭縣員山鄉湖北村湖前路185號",
  "電話": "",
  "營業時間": "24 小時開放，免門票",
  "備註": "水上木棧道、新月橋好拍；免費停車；建議停留 1–1.5 小時……",
  "來源": "使用者截圖（Threads）；https://fullfenblog.tw/yilan-dahu-area/",
  "圖片": "圖片/21_大湖風景特定區.jpg",
  "加入日期": "2026-10-28"
}
```

`id` 必須是目前資料裡的 **最大 id + 1**。先解密、讀出 `entries` 的最大 id，不要沿用記憶中的數字（避免兩邊同時各加一筆卻用了同一個 id）。

加入日期用使用者時區 **Asia/Taipei（UTC+8）** 的當天日期，格式 `YYYY-MM-DD`。

---

## 五、分類規則

### 類別（食衣住行育樂）

使用者說「吃」= `食`，「玩」= `樂`。網站與資料都用「食衣住行育樂」，不要寫成「吃」。

### 地區

- `區域`：`台灣` 或 `國外`
- 台灣 `分區`：`北` / `中` / `南` / `東` / `離島`，再填 `縣市`。**宜蘭縣歸東。**
- 日本條目：`區域` 仍寫 `國外`，`分區` 寫 `日本`，再填縣市／地點／地址。**不必另標八區欄位。**
- 網站與 Canvas 另有自動篩選，只要地名寫對就會歸入，不必多加欄位：
  - **中永和**：縣市、地點或地址含「中和區」或「永和區」（仍屬台灣・北）
  - **日本**以及八大地方：日本・北海道、日本・東北、日本・關東、日本・中部、日本・關西、日本・中國、日本・四國、日本・九州沖繩。依分區、縣市、地點、地址的都道府縣或主要城市判斷。無法歸區的日本條目仍會出現在「日本」。台灣地名即使撞名（例如高雄岡山區、臺北松山區）也不會進日本篩選。
  - 關西的「京都」不可誤判成「東京都」；「三重」只認三重縣／三重県，以免誤判新北三重區。中國地方不要用「中國」二字當關鍵字，以免和國家中國混淆。

日本八區地名對照（節錄）：

- 北海道：北海道、札幌、函館、小樽、旭川、釧路、帶廣、網走、稚內、室蘭、苫小牧、富良野、登別、知床、美瑛、定山溪、千歲 等
- 東北：青森、岩手、宮城、秋田、山形、福島，以及仙台、盛岡、郡山、會津、弘前、八戶、米澤、宮古市 等
- 關東：東京（都）、茨城、栃木、群馬、埼玉、千葉、神奈川，以及橫濱、川崎、宇都宮、水戶、前橋、高崎、鎌倉、橫須賀、箱根、成田、日光、大宮、川越、船橋、伊勢崎 等
- 中部：新潟、富山、石川、福井、山梨、長野、岐阜、靜岡、愛知，以及名古屋、金澤、甲府、松本、濱松、熱海、輕井澤、富士山／富士市、高山市、飛驒、白川鄉 等
- 關西：大阪（府）、京都（府）、兵庫、奈良、和歌山、滋賀、三重縣，以及神戶、姬路、宇治、伊勢市／伊勢神宮、白濱、高野山、西宮、蘆屋、大津 等
- 中國地方：鳥取、島根、岡山、廣島、山口，以及松江、出雲、倉敷、尾道、下關、岩國、宮島、萩 等
- 四國：德島、香川、愛媛、高知，以及高松、松山、今治、宇和島、鳴門、琴平、道後 等
- 九州沖繩：福岡、佐賀、長崎、熊本、大分、宮崎、鹿兒島、沖繩，以及那霸、博多、北九州、別府、石垣、宮古島、恩納、名護、由布院、阿蘇、佐世保 等

`子類` 自由描述，例如「小吃／碗粿」「拌麵／台灣まぜそば」。

### 專題

- **麵類**：主食是麵才標，包括牛肉麵、乾麵／福州乾麵、涼麵、拌麵、拉麵、陽春麵、麵店。不標的：蒸油餅、蔥油餅；肉圓、潤餅、生煎包店；粥店（即使有賣海鮮麵）；鵝肉店、鴨肉店（即使有賣麵或麻油麵線）；壽喜燒／火鍋只是附烏龍麵；以米粉為主（例如旗魚新竹米粉）；以大阪燒為主。
- **美國運通**：使用者說「加註美國運通」時才加。若寫「全國運通」，視為同一專題。已有其他專題就並存，不要覆蓋。不要把美國運通放進地區欄位。
- 一筆可同時有多個專題。關鍵字搜尋專題名稱也找得到。
- 若要新增「麵類／美國運通」以外的專題名稱，須同時改 `index.html` 的預設選項邏輯，並請 Grok Bot 更新 Canvas 的 `TOPICS`（網站會依資料自動補選單，Canvas 的選單是寫死的）。

---

## 六、「備忘」新增流程

使用者傳「備忘 吃／衣／住／行／育／樂」加文字、照片或截圖時：

1. **先 `git pull`（建議 `--ff-only`）再解密**，以遠端最新 `data.enc.json` 為準。
2. 看懂名稱與分店，先查是否已收錄；同一店、同一分店應補充或修正舊筆，不要重複新增。名稱不確定時先問使用者。
3. 上網查證地址、電話、營業時間、公休、招牌與價位。截圖或口述只當線索，**不可照抄來路不明的內容，也不可捏造**。來源衝突要寫進 `營業時間` 或 `備註`，並註明來源與日期。查不到或疑似歇業就據實回報，不要硬加。
4. 備份本機目前的 `data.json`（例如複製一份 `data.json.bak-YYYYMMDD-HHMMSS`，備份檔已被 gitignore）。
5. `id` = 解密後資料的最大 id + 1。
6. 若有附件圖：先在本機確認檔案存在，再複製到 `圖片/<id>_<名稱>.jpg` 或 `.png`。沒有圖則 `圖片` 留 `""`。
7. 把新 entry 追加到 `entries`，依上面規格填欄位。該標麵類或美國運通再加 `專題`。
8. 在 `CHANGELOG.md` 最上方「最新」區塊加一列：id、名稱、加入日期、由誰新增（`Codex` 或 `Grok Bot`）。
9. 執行 `build.py`，只把 `data.enc.json` 與 `CHANGELOG.md`（若也改了腳本或本指南，一併）提交並 push。
10. 回報：id、地址、電話、營業／公休、招牌與價格、疑點、commit hash、總筆數。

Grok Bot 另外還要更新 Canvas（見第八節）。**Codex 不要、也無法更新 Canvas。**

---

## 七、每次更新的指令

一律先更新遠端，再改資料。沒有改 `data.json` 就不要重跑 `build.py`：每次加密都會換新的 salt／iv，會造成沒有實際資料變更的 diff。

### Windows PowerShell（Codex）

```powershell
cd path\to\travel-log
git pull --ff-only
python decrypt.py

# 在此編輯本機 data.json、必要時放圖片、更新 CHANGELOG.md

python build.py
git add data.enc.json CHANGELOG.md
git status
# 確認暫存區沒有 data.json、圖片或密碼檔
git commit -m "Add <id> <名稱>"
git push
```

### Linux / box（Grok Bot）

```bash
cd /workspace/travel-log
git pull --ff-only
python3 decrypt.py          # 預設寫入 /home/box/shared/旅遊日誌/data.json

# 備份本機 data.json，編輯、複製圖片、更新 CHANGELOG.md

python3 build.py            # 預設讀上述 data.json，寫入 repo 的 data.enc.json
git add data.enc.json CHANGELOG.md
git status                  # 確認沒有明文被加進去
git commit -m "Add <id> <名稱>"
git push
# 接著把新筆同步到 Canvas（見第八節）
```

`build.py` 成功時會印出類似：`ok <位元組數> bytes, 108 entries -> ...`。請核對筆數是否符合預期。

指定路徑的例子（兩邊通用）：

```bash
python decrypt.py --enc data.enc.json --data data.json
python build.py --data data.json --enc data.enc.json
```

### Commit message 格式

- 新增一筆：`Add <id> <名稱>`
- 新增多筆：`Add <id>–<id> <簡述>`
- 修正：`Update <id> <名稱> (<簡述>)`
- 文件或腳本：簡短說明即可，例如 `Add Codex collaboration guide and decrypt.py`

不要在 commit message 裡寫密碼、完整電話以外的敏感個資，或大段明文備註。

---

## 八、Canvas：只有 Grok Bot 能更新

網站（GitHub Pages）與 Canvas「Vincent 旅遊日誌」是兩份介面。Canvas 只有 Grok Bot 能改。

- Codex 新增或修改條目並 push 後，網站在 `data.enc.json` 更新後就會是新內容；**Canvas 不會自動變。**
- Grok Bot 每次 `git pull` 並解密後，必須對照 `CHANGELOG.md`（以及 `data.json` 最大 id），把尚未出現在 Canvas 的條目補進 `ENTRIES`。Canvas 欄位對應：

  `id, cat, sub, name, area, zone, city, place, address, phone, hours, note, added`，選填 `topics`（對應 `專題`）。

- 寫入 Canvas 後要與 `data.json` **逐字核對**（尤其是近形字：麵、餡、彙整、縣市地名）。
- Codex 在回報裡註明「請 Grok Bot 下次同步 Canvas」即可，不必也不要設法改 Canvas。

Canvas：https://cursor.com/canvas/store-44ac3aa0-8e01-4f17-8d6c-53ddbf270280/c8f79ace-257c-4d13-9db8-79e3f2c3f8fb  
（Grok Bot 使用的 `canvas_id`：`c8f79ace-257c-4d13-9db8-79e3f2c3f8fb`）

---

## 九、「更新一下」是什麼意思

當使用者說「更新一下」而沒有指定新店家時，意思是把工作複本與網站對齊到目前 GitHub 的最新狀態，並回報現況，而不是憑記憶重寫資料。

應做的事：

1. `git pull --ff-only`
2. 解密，讀出總筆數與最大 id
3. 本機若沒有未發布的修改，**不要**無故重跑 `build.py`
4. 回報：目前總筆數、最後一筆 id 與名稱、網站連結、工作樹是否乾淨
5. Grok Bot 還要檢查 Canvas 是否缺筆並補上

不是「更新一下」就去改分類規則或重產出既有條目。

---

## 十、衝突處理

`data.enc.json` 是整包密文，**不能當文字檔合併**。預防勝於排除：先 pull 再改、盡快 push、不要兩端同時長時間各改一份。

若 `git pull --ff-only` 失敗，通常是遠端已有新 commit：

1. 先把本機尚未提交的明文 `data.json` 另外複製一份備份（仍不要 commit）。
2. 若本機還沒 commit：先 stash 或移走對 `data.enc.json` 的修改，`git pull --ff-only`，解密遠端版本，把備份裡的新條目（或修正）合併進這份明文。注意 **id 不可重複**；若雙方都用了下一個 id，後來那筆改成新的 max+1，並在 CHANGELOG 註明。
3. 若本機已經 commit 但還沒 push：`git pull --rebase`。若 `data.enc.json` 出現衝突，不要手動混密文。改為保留遠端的 `data.enc.json`、解密它，再把你這次的明文變更合併進去，重新 `build.py`，更新 CHANGELOG 後再 push。
4. **不要 force-push**，除非 Vincent 明確同意。
5. **不要為了解決衝突就把 `data.json` 加進 repo。**
6. 合併後再跑一次解密驗證，確認筆數、id 不重複、內容沒缺。

---

## 十一、紀錄方式（CHANGELOG.md）

repo 根目錄的 `CHANGELOG.md` 只記：id、名稱、加入日期、由誰新增。不含地址、電話、價格。

既有 1–108 筆已補為 Grok Bot 新增。之後請在檔案上方「最新」區塊追加，新的寫在上面，並與 `data.enc.json` 同一份 commit。

---

## 十二、安全檢查清單（每次 push 前）

- [ ] 已先 `git pull`
- [ ] `git status` 裡即將提交的檔只有 `data.enc.json`、`CHANGELOG.md` 和本次允許的程式／文件
- [ ] 沒有 `data.json`、`圖片/`、密碼檔、`.env`
- [ ] commit message 不含密碼
- [ ] `build.py` 輸出的筆數正確
- [ ] Codex 新增的話，已在回報裡提醒 Grok Bot 同步 Canvas
