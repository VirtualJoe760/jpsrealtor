import puppeteer from "puppeteer";

const scrapeSubdivision = async () => {
  const url = "https://www.realestateranchomirage.com/rancho-mirage/santo-tomas/";

  // Launch a headless browser
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle2" });

    // Extract data
    const subdivisionName = await page.$eval("h1", (el) => el.textContent?.trim() || "");
    const description = await page.$eval(".description-class", (el) => el.textContent?.trim() || "");
    const amenities = await page.$$eval(".amenities-class li", (elements) =>
      elements.map((el) => el.textContent?.trim() || "")
    );

    // Log the results
    console.log({
      subdivisionName,
      description,
      amenities,
    });
  } catch (error) {
    console.error("Error scraping the website:", error);
  } finally {
    await browser.close();
  }
};

scrapeSubdivision();
