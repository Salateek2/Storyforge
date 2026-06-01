@echo off
setlocal
rem The Netlify MCP proxy token is a secret and must NOT be committed.
rem It lives in deploy-token.local (gitignored). Paste your token there.
set "TOKEN_FILE=%~dp0deploy-token.local"
if not exist "%TOKEN_FILE%" (
  echo ERROR: deploy-token.local not found next to this script.
  echo Create it and paste your Netlify MCP proxy path on a single line, e.g.:
  echo    https://netlify-mcp.netlify.app/proxy/^<your-token^>
  echo.
  pause
  exit /b 1
)
set /p PROXY=<"%TOKEN_FILE%"

echo Deploying StoryForge to Netlify...
echo This will take 1-3 minutes. Please wait.
echo.
npx -y @netlify/mcp@latest --site-id 16477bee-80bc-4df2-99a7-9bfb8a78f9a8 --proxy-path "%PROXY%"
echo.
echo If deployment succeeded, your site is live at:
echo    https://storyforge26.netlify.app
echo Watch the deploy log in your browser:
echo    https://app.netlify.com/projects/storyforge26/deploys
echo.
pause
