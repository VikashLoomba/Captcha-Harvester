import { writeFile, readFile } from 'fs';
import { promisify } from 'util';
import path from 'path';

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

const appDataPath =
  process.env.APPDATA ||
  (process.platform === 'darwin'
    ? `${process.env.HOME}/Library/Preferences`
    : `${process.env.HOME}/.local/share`);

const captchaPath = path.join(appDataPath, '/captcha/');
const cookiesPath = path.join(appDataPath, '/captcha/cookies.json');

const writeCookies = async page => {
  try {
    const client = await page.target().createCDPSession();
    const { cookies } = await client.send('Network.getAllCookies');
    writeFileAsync(cookiesPath, JSON.stringify(cookies));
  } catch (err) {
    console.log(err);
  }
};

const restoreCookies = async page => {
  try {
    const buffer = await readFileAsync(cookiesPath);
    const cookies = JSON.parse(buffer);
    // console.log(`Loading ${cookies.length}, cookies into browser`);
    await page.setCookie(...cookies);
  } catch (err) {
    console.log(err);
  }
};

export { writeCookies, restoreCookies, cookiesPath };
