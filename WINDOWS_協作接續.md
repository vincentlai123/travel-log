# Windows 協作接續

GitHub `vincentlai123/travel-log` 的 main 與 `data.enc.json` 是唯一共同來源。原本 Python 流程繼續使用；本文件補充 Windows 的 Node 備用工具及受限環境的同步方式。

## 首次啟用

1. 先取得 GitHub main 最新檔案。不要從 Grok Canvas 的顯示文字重建資料。
2. 執行 `Setup-Collaboration.cmd`。在本機遮罩輸入框填入 **既有 GitHub Pages 日誌解鎖密碼**。這不是 GitHub 登入密碼，也不會替網站建立新密碼。
3. 工具會先解密驗證現有 `data.enc.json`，確認 JSON 與 id 有效才保存。成功後才在本機產生 `data.json` 及 `.travel-log-pass`，兩者已由 `.gitignore` 排除。既有不同內容的 `data.json` 會先備份。
4. 如果不知道既有解鎖密碼，須向原本持有它的維護端取得；協作指南不含密碼。**不要貼到聊天、commit 或 GitHub**。尚未完成這一步時，僅代表程式與交接已備妥，不能宣稱已能解密或修改真實資料。

需要 Node 18 或更新版本，不需安裝第三方套件。啟用視窗由本機 PowerShell 編譯 C# 原始碼並使用 Windows Forms，不連網、不記錄輸入內容，也不修改執行原則；錯誤密碼不會覆寫既有加密資料。不要為了啟動此程式停用安全設定或變更執行原則。

## 常用指令

```powershell
node collaboration.mjs status
node collaboration.mjs verify
node collaboration.mjs decrypt
# 備份並編輯 data.json、依 max(id)+1 配號、更新 CHANGELOG.md
node collaboration.mjs build
node --test collaboration.test.mjs
```

`status` 只檢查格式與本機設定是否存在。`verify` 才是真正驗證密碼與資料，僅回報筆數、最大 id，不列出密碼。`build` 先驗證原加密檔仍可被既有密碼解開，再加密、回讀驗證並寫入；不可藉此無意間更改網站密碼。

命令支援 `--data <path>` 與 `--enc <path>`，也沿用 `TRAVEL_LOG_DATA`、`TRAVEL_LOG_ENC`。密碼讀取順序與 Python 相同：`TRAVEL_LOG_PASS`、`TRAVEL_LOG_PASS_FILE`、使用者目錄 `.config/travel-log-pass`、repo 的 `.travel-log-pass`。密碼不可作為命令參數傳入。`configure` 是本機視窗專用命令，經標準輸入傳遞 Base64 編碼的密碼，不應手動在終端輸入或記錄。

## 遠端同步與版本衝突

一般 Git 可用時，仍依 `CODEX_協作指南.md`，先 `git pull --ff-only`，再解密、修改、加密、提交、push。

若執行環境無法直接連線 GitHub，但已授權的 GitHub 連線可用：

1. 讀取遠端 main 最新 commit SHA，並固定該 commit 的 tree 及檔案。下載後核對 blob SHA；本機已有未發布的變更時，先備份及整合。
2. 對這份最新資料解密、查重及編輯。僅產生本次需要的修改，保留其他維護者的內容。
3. 提交前確認沒有明文、圖片、密碼、備份或環境設定。以原 tree 為基礎建立新的 tree 與 commit；密文與 CHANGELOG 必須在同一 commit。
4. 更新 main 時帶入原 commit SHA 作為 expected head，使用非強制的快轉更新。若遠端 head 已不同，重新讀取、解密並合併本次條目；不得強制覆蓋或合併密文。
5. 核對提交中的 `data.enc.json` blob、CHANGELOG 與發布後的檔案。若只是更新協作程式，不得重新加密或改變既有資料。

此方式只替代 Git 的傳輸，不取消最新版本、資料保留與衝突檢查要求。不能把未執行的 pull / push 回報成已成功。

## Grok 接手

Grok 每次仍先讀最新版、解密並對照 CHANGELOG，把缺少的條目同步到 Canvas。Canvas 只有 Grok 能更新，不會隨 GitHub 提交自動變動。這套流程沒有建立 Bot 之間的直接通訊。

協作工具的更新不屬於新增店家，不占用 id，也不應改寫既有條目。
