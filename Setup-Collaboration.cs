// Local masked-password window. No network requests or password logging.
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text;
using System.Windows.Forms;

public static class TravelLogSetup
{
    public static void Show(string root)
    {
        Application.EnableVisualStyles();
        using (var form = new Form())
        {
            form.Text = "Vincent 旅遊日誌：啟用本機協作";
            form.ClientSize = new Size(610, 310);
            form.StartPosition = FormStartPosition.CenterScreen;
            form.FormBorderStyle = FormBorderStyle.FixedDialog;
            form.MaximizeBox = false;
            form.MinimizeBox = false;
            form.TopMost = true;
            var label = new Label {
                Location = new Point(20, 15), Size = new Size(570, 100),
                Text = "請輸入 GitHub Pages 旅遊日誌的既有解鎖密碼。\r\n這個視窗只在本機驗證及保存，不會上傳密碼。\r\n若你不知道密碼，請向原本建立網站的 Grok Bot 取得。\r\n這裡不會替網站建立或更改密碼。"
            };
            var password = new TextBox {
                Location = new Point(20, 122), Size = new Size(570, 26),
                UseSystemPasswordChar = true
            };
            var result = new Label {
                Location = new Point(20, 166), Size = new Size(570, 75),
                Text = "驗證成功後即可由 Codex 讀取及更新加密日誌。"
            };
            var save = new Button {
                Location = new Point(355, 257), Size = new Size(125, 34), Text = "驗證並啟用"
            };
            var cancel = new Button {
                Location = new Point(490, 257), Size = new Size(100, 34), Text = "稍後設定"
            };
            cancel.Click += delegate { form.Close(); };
            save.Click += delegate {
                if (String.IsNullOrWhiteSpace(password.Text)) {
                    result.Text = "請輸入既有密碼；若不知道，可先按「稍後設定」。";
                    return;
                }
                save.Enabled = false;
                result.Text = "正在驗證既有資料，請稍候…";
                form.Refresh();
                try {
                    var start = new ProcessStartInfo {
                        FileName = "node.exe",
                        Arguments = "\"" + Path.Combine(root, "collaboration.mjs") + "\" configure",
                        WorkingDirectory = root,
                        UseShellExecute = false, CreateNoWindow = true,
                        RedirectStandardInput = true,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        StandardOutputEncoding = Encoding.UTF8,
                        StandardErrorEncoding = Encoding.UTF8
                    };
                    using (var process = Process.Start(start)) {
                        process.StandardInput.Write(Convert.ToBase64String(Encoding.UTF8.GetBytes(password.Text)));
                        process.StandardInput.Close();
                        var output = process.StandardOutput.ReadToEnd().Trim();
                        var error = process.StandardError.ReadToEnd().Trim();
                        process.WaitForExit();
                        if (process.ExitCode != 0) throw new Exception(error.Length > 0 ? error : "驗證未完成，沒有啟用。");
                        if (!output.Contains("\"configured\":true")) throw new Exception("未取得成功驗證結果。");
                        password.Clear();
                        password.Enabled = false;
                        result.Text = "啟用完成：已驗證現有加密資料。\r\n密碼僅保存在本機，不必貼到聊天。請回覆 Codex「啟用好了」。";
                        cancel.Text = "完成";
                    }
                } catch (Exception error) {
                    result.Text = error.Message;
                    save.Enabled = true;
                }
            };
            form.Controls.AddRange(new Control[] {label, password, result, save, cancel});
            form.AcceptButton = save;
            form.CancelButton = cancel;
            form.Shown += delegate { password.Focus(); };
            form.ShowDialog();
        }
    }
}
