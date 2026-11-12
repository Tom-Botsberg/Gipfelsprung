@echo off
setlocal
title Gipfelsprung - Lokaler Spielserver
if exist "%~dp0bin\Gipfelsprung.Server.exe" goto run
set "COMPILER=%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%COMPILER%" set "COMPILER=%SystemRoot%\Microsoft.NET\Framework\v4.0.30319\csc.exe"
if not exist "%COMPILER%" (
    echo Der Windows .NET-Compiler wurde nicht gefunden.
    echo Alternativ index.html direkt im Browser oeffnen.
    pause
    exit /b 1
)
if not exist "%~dp0bin" mkdir "%~dp0bin"
if errorlevel 1 (
    echo Der Ausgabeordner konnte nicht erstellt werden.
    pause
    exit /b 1
)
"%COMPILER%" /nologo /target:exe /reference:System.Web.Extensions.dll /out:"%~dp0bin\Gipfelsprung.Server.exe" "%~dp0Server.cs"
if errorlevel 1 (
    echo Der Spielserver konnte nicht erstellt werden.
    pause
    exit /b 1
)
:run
"%~dp0bin\Gipfelsprung.Server.exe" "%~dp0." %*
if errorlevel 1 (
    pause
    exit /b 1
)
