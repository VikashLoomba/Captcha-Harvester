const { CaptchaHarvester } = require('./Harvester');

(async () => {
   
    let harvester = new CaptchaHarvester('6LeWwRkUAAAAAOBsau7KpuC9AV-6J8mhw4AjC3Xz', 'https://www.supremenewyork.com/checkout');
    let harvester_id = await harvester.start_captcha_harvester();
    await harvester.harvest_captcha_token(harvester_id);
    let captcha_object = false;
    while(!captcha_object) {
        captcha_object = await harvester.retrieve_captcha_token(harvester_id);
        await harvester.timeout(1000);
    }
    console.log(captcha_object);

})()