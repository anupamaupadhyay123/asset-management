ROF ASSET MANAGEMENT - PASSWORD RECOVERY / SMTP SETUP
====================================================

WHAT IS INCLUDED
- Original ROF logo on login and main sidebar pages.
- Login page Forgot Password link and self-service OTP reset page.
- Self-service recovery OTP is sent to the user's registered email.
- Admin User Management password reset requires OTP to the signed-in admin's registered email.
- After OTP verification, the employee receives a time-limited reset link.
- SMTP secrets are read from environment variables; never commit real credentials.

REQUIRED SETUP
1. Install Node.js LTS on the server.
2. Open this project folder in Command Prompt.
3. Run: npm install
4. Copy .env.example to .env.
5. Ask ROF IT/email administrator for the approved SMTP host, port, sender account and credentials.
6. Fill SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS and SMTP_FROM in .env.
7. Set APP_BASE_URL to the actual URL users open in the office (for example http://192.168.x.x:3000 or the approved internal DNS URL).
8. Run: npm start
9. Test Forgot Password and admin User Management Reset Password using accounts with valid registered email addresses.

IMPORTANT
- Do not use the example SMTP credentials. They are placeholders only.
- Some users share an office email. An OTP sent to a shared mailbox verifies mailbox access, not the individual employee's identity. For strong individual recovery, use unique verified employee email addresses or an approved additional identity check.
- OTPs and reset tokens are held in server memory and expire automatically; a server restart invalidates pending recovery attempts. Do not run multiple Node instances without moving recovery state to a shared database/store.
- SMTP/network connectivity must be allowed from the application server to the mail server.
- Keep the existing database/asset.db backup before deployment. Do not replace it with a blank database.
- The existing session configuration and any pre-existing settings should be reviewed by ROF IT before production exposure. Use HTTPS where available.

WINDOWS / POWERSHELL INSTALL FIX
1. Open a terminal in the project folder. In PowerShell use `npm.cmd install` (not `npm install`) if script execution policy blocks npm.ps1.
2. Copy `.env.example` to `.env`. Fill the approved SMTP host, port, TLS mode and password supplied by ROF IT.
3. Keep SMTP_USER and SMTP_FROM as itsupport@rof.co.in only if ROF IT confirms this mailbox is allowed to authenticate and send mail.
4. Restart with `node server.js`. Never share or commit the real `.env` file.

SMTP LIMITATION
The project cannot send OTP until ROF IT provides the real SMTP hostname and approved SMTP authentication secret/app password (and enables SMTP AUTH/relay if required). The admin email address alone is not enough. Do not guess the server host or use a personal mailbox.
