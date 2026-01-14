const express = require("express");
const bodyParser = require("body-parser");
const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();

chromium.use(stealth);

const app = express();
app.use(bodyParser.json());

/* =========================================================
   1. MINISTRY OF JUSTICE
========================================================= */
async function scrapeMinistryOfJustice() {
  const browser = await chromium.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 768 },
    locale: "uk-UA",
  });

  const page = await context.newPage();
  const finalResults = [];

  try {
    await page.goto("https://minjust.gov.ua/news", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForSelector("article.grid-item a.post-container", {
      timeout: 20000,
    });

    const articles = await page.evaluate(() => {
      const nodes = document.querySelectorAll(
        "article.grid-item a.post-container"
      );
      return Array.from(nodes).map((n) => {
        const title = n.innerText?.trim() || "No Title";
        const url = n.href;
        const dateText =
          n
            .closest("article")
            ?.querySelector(".latest-news__date span")
            ?.innerText?.trim() || "";
        return { title, url, dateText };
      });
    });

    for (const article of articles) {
      const articlePage = await context.newPage();
      try {
        await articlePage.goto(article.url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        const content = await articlePage.evaluate(() => {
          const container = document.querySelector(
            ".latest-news__description"
          );
          return container ? container.innerText.trim() : "No content found";
        });

        finalResults.push({
          title: article.title,
          url: article.url,
          date: article.dateText,
          content,
        });

        await new Promise((r) => setTimeout(r, 1000));
      } finally {
        await articlePage.close();
      }
    }

    return finalResults;
  } finally {
    await browser.close();
  }
}

/* =========================================================
   2. MINISTRY OF ENERGY
========================================================= */
async function scrapeMinistryOfEnergy() {
  const BASE_URL = "https://mev.gov.ua/news";

  const browser = await chromium.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();
  const finalResults = [];

  try {
    await page.goto(BASE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForSelector(".view-content", { timeout: 30000 });

    const pageItems = await page.evaluate(() => {
      const results = [];
      let currentDateHeader = "";
      const elements = document.querySelectorAll(
        ".view-content h3, .view-content .views-row"
      );

      elements.forEach((el) => {
        if (el.tagName === "H3") currentDateHeader = el.innerText.trim();
        if (el.classList.contains("views-row")) {
          const linkEl = el.querySelector("h2 a");
          const time =
            el.querySelector(".views-field-created-1 span")?.innerText?.trim() ||
            "";
          if (linkEl) {
            results.push({
              url: linkEl.href,
              title: linkEl.innerText.trim(),
              date: currentDateHeader,
              time,
            });
          }
        }
      });
      return results;
    });

    for (const item of pageItems) {
      const articlePage = await context.newPage();
      try {
        await articlePage.goto(item.url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        await articlePage.waitForSelector("div.field--name-body", {
          timeout: 10000,
        });

        const content = await articlePage.evaluate(() => {
          const paragraphs = document.querySelectorAll(
            "div.field--name-body.field__item p"
          );
          return Array.from(paragraphs)
            .map((p) => p.innerText.trim())
            .join("\n\n");
        });

        finalResults.push({ ...item, content });
        await new Promise((r) => setTimeout(r, 1000));
      } finally {
        await articlePage.close();
      }
    }

    return finalResults;
  } finally {
    await browser.close();
  }
}

/* =========================================================
   3. MINISTRY OF FINANCE
========================================================= */
async function scrapeMinistryOfFinance() {
  const browser = await chromium.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();
  const finalResults = [];

  try {
    await page.goto("https://www.mof.gov.ua/uk/news", {
      waitUntil: "commit",
      timeout: 60000,
    });

    const articleSelector =
      "a.card__title-link, .news-list a, .cards-list a";
    await page.waitForSelector(articleSelector, { timeout: 30000 });

    const articleLinks = await page.$$eval(articleSelector, (links) =>
      Array.from(new Set(links.map((a) => a.href)))
    );

    for (const url of articleLinks) {
      const articlePage = await context.newPage();
      try {
        await articlePage.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        const data = await articlePage.evaluate(() => {
          const title =
            document.querySelector("h1, .title-h1")?.innerText?.trim();
          const date =
            document.querySelector(".bottom-line, .date")?.innerText?.trim();
          const content =
            document.querySelector(
              ".external-text-wrap, .article__content, .page-content"
            )?.innerText?.trim();

          return {
            title: title || "No title",
            date: date || "No date",
            content: content || "No content",
          };
        });

        finalResults.push({ url, ...data });
        await new Promise((r) => setTimeout(r, 1000));
      } finally {
        await articlePage.close();
      }
    }

    return finalResults;
  } finally {
    await browser.close();
  }
}

/* =========================================================
   4. MINISTRY OF ECONOMY
========================================================= */
async function scrapeMinistryOfEconomy() {
  const BASE_URL =
    "https://me.gov.ua/News/List?lang=en-GB&tag=News";
  const CONTENT_SELECTOR =
    ".page__content--description, .article__content";

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();
  const results = [];

  try {
    await page.goto(BASE_URL, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForSelector("ul.page__content--list li", {
      timeout: 20000,
    });

    const allLinksMetadata = await page.$$eval(
      "ul.page__content--list li",
      (nodes) =>
        nodes
          .map((n) => ({
            url: n.querySelector(".desc a")?.href,
            dateStr: n
              .querySelector(".content__date")
              ?.innerText.split("|")[0]
              .trim(),
          }))
          .filter((i) => i.url)
    );

    for (const item of allLinksMetadata) {
      const articlePage = await context.newPage();
      try {
        await articlePage.goto(item.url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        const data = await articlePage.evaluate((cSel) => {
          const title =
            document.querySelector("h1")?.innerText?.trim() ||
            "No Title";
          const content =
            document.querySelector(cSel)?.innerText?.trim() ||
            "No Content";
          return { title, content };
        }, CONTENT_SELECTOR);

        results.push({
          url: item.url,
          date: item.dateStr,
          ...data,
        });

        await new Promise((r) => setTimeout(r, 1000));
      } finally {
        await articlePage.close();
      }
    }

    return results;
  } finally {
    await browser.close();
  }
}

/* =========================================================
   5. MINISTRY OF FOREIGN AFFAIRS
========================================================= */
async function scrapeMinistryOfForeignAffairs() {
  const MAX_PAGES = 5;
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();
  const allArticles = [];
  const finalResults = [];

  try {
    await page.goto(
      "https://mfa.gov.ua/timeline?&type=posts&category_id=2",
      { waitUntil: "networkidle", timeout: 60000 }
    );

    for (let i = 1; i <= MAX_PAGES; i++) {
      const apiUrl = `https://mfa.gov.ua/api/timeline?&type=posts&category_id=2&page=${i}&lang=ua`;
      const response = await page.goto(apiUrl, {
        waitUntil: "domcontentloaded",
      });
      let data = await response.json();
      if (typeof data.data === "string") data.data = JSON.parse(data.data);

      for (const dateKey in data.data) {
        data.data[dateKey].forEach((a) =>
          allArticles.push({
            url: a.url,
            title: a.title,
            date: dateKey,
          })
        );
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    for (const item of allArticles) {
      const articlePage = await context.newPage();
      try {
        await articlePage.goto(item.url, {
          waitUntil: "load",
          timeout: 40000,
        });

        const content = await articlePage.evaluate(() => {
          const el =
            document.querySelector(".editor-content") ||
            document.querySelector(".article__content") ||
            document.querySelector("#layout-content article");
          if (!el) return null;
          el.querySelectorAll(
            ".share-buttons, script, style, .tags"
          ).forEach((g) => g.remove());
          return el.innerText.trim();
        });

        finalResults.push({ ...item, content });
      } finally {
        await articlePage.close();
      }
    }

    return finalResults;
  } finally {
    await browser.close();
  }
}

/* =========================================================
   6. MINISTRY OF INTERNAL AFFAIRS
========================================================= */
async function scrapeMinistryOfInternalAffairs() {
  const MAX_PAGES = 10;
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();
  const allLinks = [];
  const finalResults = [];

  try {
    for (let i = 1; i <= MAX_PAGES; i++) {
      await page.goto(
        `https://mvs.gov.ua/press-center/news?page=${i}`,
        { waitUntil: "domcontentloaded" }
      );
      await page.waitForSelector("a.card__title");
      const links = await page.$$eval("a.card__title", (a) =>
        a.map((x) => x.href)
      );
      links.forEach((l) => !allLinks.includes(l) && allLinks.push(l));
    }

    for (const url of allLinks) {
      const p = await context.newPage();
      try {
        await p.goto(url, { waitUntil: "domcontentloaded" });
        await p.waitForSelector("article.article");

        const data = await p.evaluate(() => {
          const title =
            document.querySelector("h3.block-title__title")
              ?.innerText || "";
          const date =
            document.querySelector(
              ".title-with-ico__title.supportive-text"
            )?.innerText || "";
          const nodes = document.querySelectorAll(
            "article.article p, article.article ul li"
          );
          const content = Array.from(nodes)
            .map((n) => n.innerText.trim())
            .filter((t) => t.length > 5)
            .join("\n\n");
          return { title, date, content };
        });

        finalResults.push({ url, ...data });
      } finally {
        await p.close();
      }
    }

    return finalResults;
  } finally {
    await browser.close();
  }
}

/* =========================================================
   7. MINISTRY OF DIGITAL TRANSFORMATION
========================================================= */
async function scrapeMinistryOfDigitalTransformation() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();
  const finalResults = [];

  try {
    await page.goto("https://thedigital.gov.ua/news", {
      waitUntil: "networkidle",
    });

    const metadata = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a.card__link")).map(
        (a) => {
          const card = a.closest("article");
          const time = card?.querySelector("time");
          return {
            url: a.href,
            title: a.innerText.trim(),
            date: time?.getAttribute("datetime"),
          };
        }
      );
    });

    for (const item of metadata) {
      const p = await context.newPage();
      try {
        await p.goto(item.url, {
          waitUntil: "domcontentloaded",
        });
        await p.waitForSelector("article.prose");

        const data = await p.evaluate(() => {
          const art = document.querySelector("article.prose");
          const title = art.querySelector("h1")?.innerText || "";
          const text = Array.from(
            art.querySelectorAll(
              ".lead p, p:not(.sr-only), blockquote p"
            )
          )
            .map((n) => n.innerText.trim())
            .filter((t) => t.length > 5)
            .join("\n\n");
          return { title, content: text };
        });

        finalResults.push({ ...item, ...data });
      } finally {
        await p.close();
      }
    }

    return finalResults;
  } finally {
    await browser.close();
  }
}

/* =========================================================
   HTTP ROUTER
========================================================= */
app.post("/scrape", async (req, res) => {
  const { targetUrl } = req.body;
  if (!targetUrl) return res.status(400).json({ error: "targetUrl required" });

  try {
    let data;
    switch (true) {
      case targetUrl.includes("minjust.gov.ua"):
        data = await scrapeMinistryOfJustice();
        break;
      case targetUrl.includes("mev.gov.ua"):
        data = await scrapeMinistryOfEnergy();
        break;
      case targetUrl.includes("mof.gov.ua"):
        data = await scrapeMinistryOfFinance();
        break;
      case targetUrl.includes("me.gov.ua"):
        data = await scrapeMinistryOfEconomy();
        break;
      case targetUrl.includes("mfa.gov.ua"):
        data = await scrapeMinistryOfForeignAffairs();
        break;
      case targetUrl.includes("mvs.gov.ua"):
        data = await scrapeMinistryOfInternalAffairs();
        break;
      case targetUrl.includes("thedigital.gov.ua"):
        data = await scrapeMinistryOfDigitalTransformation();
        break;
      default:
        throw new Error("Unsupported URL");
    }

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(3000, () =>
  console.log("🚀 Scraper API running on http://localhost:3000/scrape")
);
