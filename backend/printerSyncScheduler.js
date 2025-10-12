const cron = require('node-cron');
const syncPrinters = require('./utils/printerSync');
const NewShop = require('./models/NewShop');

// Run every minute for all shops
cron.schedule('* * * * *', async () => {
  try {
    const shops = await NewShop.find({});
    for (const shop of shops) {
      try {
        await syncPrinters(shop.shopId);
        console.log(`Synced printers for shop ${shop.shopId}`);
      } catch (err) {
        console.error(`Sync failed for shop ${shop.shopId}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Printer sync scheduler error:', err.message);
  }
});
