/**
 * Scrape Restaurant Week Website for All 51 Participating Restaurants
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kufcxxynjvyharhtfptd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrapeRestaurantWeek() {
  console.log('\n🔍 Scraping Restaurant Week website...\n');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.lancastercityrestaurantweek.com', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for content to load (adjust selector based on actual page structure)
    await page.waitForSelector('body', { timeout: 10000 });

    // Try different selectors to find restaurant names
    const restaurants = await page.evaluate(() => {
      const names = new Set();

      // Try various selectors that might contain restaurant names
      const selectors = [
        'h1', 'h2', 'h3', 'h4', // Headers
        '.restaurant-name',
        '.restaurant',
        '[class*="restaurant"]',
        'a[href*="restaurant"]',
        'div[class*="grid"] a',
        'div[class*="item"] h3',
        'div[class*="title"]'
      ];

      selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 2 && text.length < 100) {
              names.add(text);
            }
          });
        } catch (e) {
          // Ignore selector errors
        }
      });

      return Array.from(names);
    });

    console.log(`Found ${restaurants.length} potential restaurant names:\n`);
    restaurants.forEach((name, i) => {
      console.log(`${i + 1}. ${name}`);
    });

    // Get page HTML for manual inspection
    const html = await page.content();
    console.log('\n📄 Saving full HTML for manual review...');

    await browser.close();

    return { restaurants, html };

  } catch (error) {
    console.error('Error scraping:', error.message);
    await browser.close();
    throw error;
  }
}

async function main() {
  const { restaurants, html } = await scrapeRestaurantWeek();

  // Save HTML to file for manual inspection
  const fs = await import('fs');
  fs.writeFileSync('/tmp/rw-website.html', html);
  console.log('✅ Saved to /tmp/rw-website.html');

  console.log(`\n\n📊 Summary: Found ${restaurants.length} restaurant names`);
  console.log('\nNext step: Review the list above and /tmp/rw-website.html to confirm all 51 restaurants');
}

main().catch(console.error);
