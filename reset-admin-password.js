// ============================================================
// OFFLINE USER PASSWORD RESET
// ROF ASSET MANAGEMENT SYSTEM
// ============================================================
// Run from the project folder with: node reset-admin-password.js
// Use only on the trusted server while the application is stopped.

const crypto = require("crypto");
const readline = require("readline");
const db = require("./database/database");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question, { hidden = false } = {}) {
    return new Promise(resolve => {
        if (!hidden || !process.stdin.isTTY) {
            rl.question(question, resolve);
            return;
        }

        const stdin = process.stdin;
        const onData = char => {
            char = char.toString();
            if (char === '\n' || char === '\r' || char === '\u0004') {
                stdin.removeListener('data', onData);
                stdin.setRawMode(false);
                process.stdout.write('\n');
                resolve(value);
                return;
            }
            if (char === '\u0003') process.exit(1);
            if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
            else value += char;
        };
        let value = '';
        process.stdout.write(question);
        stdin.setRawMode(true);
        stdin.resume();
        stdin.on('data', onData);
    });
}

function hashPassword(password) {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString('hex');
        crypto.scrypt(password, salt, 64, (error, derivedKey) => {
            if (error) return reject(error);
            resolve(`${salt}:${derivedKey.toString('hex')}`);
        });
    });
}

async function main() {
    try {
        console.log('\nROF Asset Management - Offline Password Reset');
        console.log('Use this only if you are authorized to reset the account.');
        const username = String(await ask('Username to reset (e.g. admin): ')).trim();
        if (!username) throw new Error('Username is required.');
        const password = await ask('New password (minimum 10 characters): ', { hidden: true });
        if (password.length < 10) throw new Error('Password must be at least 10 characters long.');
        const confirm = await ask('Confirm new password: ', { hidden: true });
        if (password !== confirm) throw new Error('Passwords do not match.');

        const passwordHash = await hashPassword(password);
        db.run('UPDATE users SET password_hash = ? WHERE username = ?', [passwordHash, username], function (error) {
            if (error) {
                console.error('Password reset failed:', error.message);
                return db.close(() => { rl.close(); process.exitCode = 1; });
            }
            if (this.changes === 0) console.error(`No user found with username: ${username}`);
            else console.log(`Password reset successful for ${username}.`);
            db.close(closeError => {
                if (closeError) console.error('Database close error:', closeError.message);
                rl.close();
                if (this.changes === 0 || closeError) process.exitCode = 1;
            });
        });
    } catch (error) {
        console.error(error.message);
        db.close(() => { rl.close(); process.exitCode = 1; });
    }
}

main();
