@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -STA -Command "try { Add-Type -Path (Join-Path (Get-Location) 'Setup-Collaboration.cs') -ReferencedAssemblies 'System.Windows.Forms','System.Drawing'; [TravelLogSetup]::Show((Get-Location).Path) } catch { Write-Host $_.Exception.Message; exit 1 }"
if errorlevel 1 pause
