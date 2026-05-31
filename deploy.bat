@echo off
echo Deploying StoryForge to Netlify...
echo This will take 1-3 minutes. Please wait.
echo.
npx -y @netlify/mcp@latest --site-id 16477bee-80bc-4df2-99a7-9bfb8a78f9a8 --proxy-path "https://netlify-mcp.netlify.app/proxy/eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..EawuiTyagCgOyAgh.aVvteZzSac_FhDi8CPOpOw1hZumABKxmE2CoOMPMzRMy0EXd89P96lFUfKsa0xVLLdAI-q9mVAjnzvy2eqUqDPPeGCYAmv1iyQ63QqolqN20iTN73wTkJ5FJdkmwjHJii67gCFsG-A7upvb_CzAW29vqz12eQk5wNFLWf0PstU7E68uETPCW8SeuoghBmOKeiJ2UYOGS3uIQGeP901m34brQqVX9ivHVN9bGFHyJ0iZQl43wsEosbAMWrwsqMSuNcqJIx54aoNNFztj2Qx6RoiS8F18HPOuxTdoF4RCEyJx_ePav9f16wUG8PiL2arCPtIUgbGlhfe8PrfpdwT6knZfMrup_uyQGJpwPFhjQHxrjguJnFA.ZFusI9zola3iznvSmL0OnA"
echo.
echo If deployment succeeded, your site is live at:
echo    https://storyforge26.netlify.app
echo Watch the deploy log in your browser:
echo    https://app.netlify.com/projects/storyforge26/deploys
echo.
pause
