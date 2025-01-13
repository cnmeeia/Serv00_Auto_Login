const fs = require('fs');
const puppeteer = require('puppeteer');

function formatToISO(date) {
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z/, '');
}

async function delayTime(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  // 读取 accounts.json
  const accountsJson = fs.readFileSync('accounts.json', 'utf-8');
  const accounts = JSON.parse(accountsJson);

  for (const account of accounts) {
    const { username, password, panelnum, bark } = account;

    // 校验账户信息
    if (!username || !password || !panelnum) {
      console.error(`账号信息不完整: ${JSON.stringify(account)}`);
      continue;
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    let url = `https://panel${panelnum}.serv00.com/login/?next=/`;

    try {
      await page.goto(url, { waitUntil: 'networkidle2' });

      // 输入账号密码
      await page.type('#id_username', username, { delay: 100 });
      await page.type('#id_password', password, { delay: 100 });

      // 提交登录表单
      const loginButton = await page.$('#submit');
      if (!loginButton) throw new Error('无法找到登录按钮');
      await loginButton.click();

      // 等待跳转并检查是否登录成功
      await page.waitForNavigation({ timeout: 10000 });
      const isLoggedIn = await page.evaluate(() => {
        return !!document.querySelector('a[href="/logout/"]');
      });

      // 记录登录状态
      const nowUtc = formatToISO(new Date());
      const nowBeijing = formatToISO(new Date(new Date().getTime() + 8 * 60 * 60 * 1000));
      if (isLoggedIn) {
        if (bark) await fetch(`https://api.day.app/${bark}/Serv00自动登录/账号 ${username} 于北京时间 ${nowBeijing}（UTC时间 ${nowUtc}）登录成功！`);
        console.log(`[${nowBeijing}] 账号 ${username} 登录成功`);
      } else {
        if (bark) await fetch(`https://api.day.app/${bark}/Serv00自动登录/账号 ${username} 登录失败`);
        console.error(`[${nowBeijing}] 账号 ${username} 登录失败`);
      }
    } catch (error) {
      // 错误处理
      if (bark) await fetch(`https://api.day.app/${bark}/Serv00自动登录/账号 ${username} 登录时出现错误: ${error.message}`);
      console.error(`账号 ${username} 登录时出现错误: ${error.message}`);
    } finally {
      await page.close();
      await browser.close();

      // 随机延时
      const delay = Math.floor(Math.random() * 8000) + 1000;
      await delayTime(delay);
    }
  }

  console.log('所有账号登录完成！');
})();