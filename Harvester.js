const { webkit } = require('playwright');
const { writeCookies, restoreCookies, cookiesPath } = require('./write_cookies');
const fs = require('fs')
class CaptchaHarvester {
    constructor(site_key, site_host) {
        this.captcha_bank = [];
        this.harvesters = [];
        this.site_key = site_key;
        this.site_host = site_host;
        this.captchaTemplate = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Captcha Harvester</title>
          <script src="https://www.google.com/recaptcha/api.js" async defer></script>
          
          <script>
            window.captcha = "";
            function sub(token){
              document.getElementById("submit").click();
              window.sendCaptcha(token);
            }
            function captchaCallback(token) {
                window.captcha = token;
              window.sendCaptcha(token);
              window.grecaptcha.reset();
            }
          </script>
          <style>
            .flex {
              display: flex;
            }
            .justify-center {
              justify-content: center;
            }
            .items-center {
              align-items: center;
            }
            .mt-6 {
              margin-top: 1.5rem;
            }
          </style>
        </head>
        <body>
            <div class="flex justify-center items-center mt-6">
                <button id="submit" onClick="grecaptcha.execute();">Submit</button>
                <div class="g-recaptcha" data-sitekey=${this.site_key} data-callback="captchaCallback" data-size="invisible"></div>
                
            </div>
        </body>
        </html>
        `;
    }

    async login_to_google(new_account = false) {
        try {
            if(!new_account && await restoreCookies()) {
                console.log("Already have google cookies written.");
                return true;
            }
            let browser = await webkit.launch({ headless: false });
            let captcha_page = await browser.newPage({ viewport: { width: 400, height: 700 } });
            await captcha_page.goto('https://www.gmail.com');
            await captcha_page.waitForSelector('.aim', { timeout: 0 });
            let cookies = await captcha_page.context().cookies();
            await writeCookies(cookies);
            await browser.close();
            return true;
        } catch(e) {
            throw(e);
        }
    }

    async start_captcha_harvester() {
        const task_harvester = { uuid: this.uuidv4(), browser: null, captcha_page: null };
        try {
            await this.login_to_google();
            let browser = await webkit.launch({ headless: false });
            let captcha_page = await browser.newPage({ viewport: { width: 400, height: 700 } });
            let cookies = await restoreCookies(captcha_page);
            await captcha_page.context().addCookies(cookies);
            // Set up the route redirection to render a captcha.
            await captcha_page.route(`${this.site_host}`, route => {
                route.fulfill({
                    status: 200,
                    contentType: 'text/html',
                    body: this.captchaTemplate,
                })
            });

            await captcha_page.goto(`${this.site_host}`);
            task_harvester.browser = browser;
            task_harvester.captcha_page = captcha_page;
            this.harvesters.push(task_harvester);
            return task_harvester.uuid;
        } catch(e) {
            throw(e);
        }
    }

    async harvest_captcha_token(uuid) {
        let task_harvester;
        const task_harvester_matches = this.harvesters.filter((task_harvester_object) => task_harvester_object.uuid === uuid);
        if(task_harvester_matches.length === 1) {
            task_harvester = task_harvester_matches[0];
        }
        try {
            // Set up the window function.
            await task_harvester.captcha_page.exposeFunction('sendCaptcha', token => {
                const captchaItem = {
                  uuid,
                  token,
                  host: `${this.site_host}`,
                  sitekey: `${this.site_key}`,
                };
                this.captcha_bank.push(captchaItem);
            });
            await task_harvester.captcha_page.click('#submit');
        } catch(e) {
            throw(e);
        }
    }

    async retrieve_captcha_token(uuid) {
        let captcha_token_for_task = this.captcha_bank.filter(captcha_object => captcha_object.uuid === uuid);
        if(captcha_token_for_task.length === 0) {
            return false;
        } else {
            const task_harvester_matches = this.harvesters.filter((task_harvester_object) => task_harvester_object.uuid === uuid);
            if(task_harvester_matches.length === 1) {
                let task_harvester = task_harvester_matches[0];
                await task_harvester.browser.close();
                return captcha_token_for_task[0];
            } else {
                return false;
            }
        }
    }

    uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
    }

    async timeout(delay) {
        // console.log('browser waiting for: ', delay)
        return new Promise(resolve => setTimeout(resolve, delay));
    }
}

module.exports = {
    CaptchaHarvester
}
