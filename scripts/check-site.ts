import { connectDB, Site } from '../lib/db';

async function checkSite() {
  await connectDB();
  
  const sites = await Site.find({});
  console.log('\n📊 Sites in database:');
  console.log('==================');
  
  sites.forEach(site => {
    console.log(`\nSite: ${site.name}`);
    console.log(`Site ID: ${site.site_id}`);
    console.log(`API Key: ${site.api_key}`);
    console.log(`User ID: ${site.user_id}`);
    console.log(`Created: ${site.created_at}`);
  });
  
  if (sites.length === 0) {
    console.log('\n⚠️  No sites found in database!');
  }
  
  process.exit(0);
}

checkSite().catch(console.error);
