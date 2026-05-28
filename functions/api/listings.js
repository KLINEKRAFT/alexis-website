// Cloudflare Pages Function — GET /api/listings
// Fetches the Coldwell Banker Select Zillow XML feed server-side, filters to
// Alexis Oakes' active listings, returns compact JSON. If the feed is
// unreachable or returns zero matches, falls back to a verified snapshot of
// her current active listings so the site never shows empty/photo-less cards.

const FEED_URL = "http://realistiq.net/exports/iq_cb_select_zillow.xml";
const AGENT_EMAIL = "aoakes@cbtulsa.com";
const AGENT_NAME = "alexis oakes";

// Verified snapshot (source: aoakes.cbtulsa.com agent page). Used only when the
// live feed yields nothing. Photos are public MLS CDN URLs.
const FALLBACK = [
  { address:"1401 S Rockford Avenue", city:"Tulsa", state:"OK", zip:"74120",
    price:449000, beds:2, baths:3, sqft:1994,
    url:"https://www.cbtulsa.com/for-sale/1401-s-rockford-avenue-tulsa-ok-74120/id_1466896",
    photos:["https://sj-feeds.cdn.backatyou.com/mls_tulsa/images/2616210/1401-s-rockford-avenue-000.jpeg?dt=20260508193527"] },
  { address:"1475 S 271st West Avenue", city:"Sand Springs", state:"OK", zip:"74063",
    price:420000, beds:4, baths:2, sqft:2289,
    url:"https://www.cbtulsa.com/for-sale/1475-s-271st-west-avenue-sand-springs-ok-74063/id_1469005",
    photos:["https://sj-feeds.cdn.backatyou.com/mls_tulsa/images/2615523/1475-s-271st-west-avenue-000.jpeg?dt=20260514174206"] },
  { address:"8431 S Sandusky Avenue", city:"Tulsa", state:"OK", zip:"74137",
    price:359000, beds:4, baths:2, sqft:2374,
    url:"https://www.cbtulsa.com/for-sale/8431-s-sandusky-avenue-tulsa-ok-74137/id_1470847",
    photos:["https://sj-feeds.cdn.backatyou.com/mls_tulsa/images/2618237/8431-s-sandusky-avenue-000.jpeg?dt=20260520135146"] },
  { address:"8819 S 74th East Avenue", city:"Tulsa", state:"OK", zip:"74133",
    price:319000, beds:4, baths:3, sqft:2021,
    url:"https://www.cbtulsa.com/for-sale/8819-s-74th-east-avenue-tulsa-ok-74133/id_1472878",
    photos:["https://sj-feeds.cdn.backatyou.com/mls_tulsa/images/2619346/8819-s-74th-east-avenue-000.jpeg?dt=20260528102855"] },
];

const tag = (b,n)=>{ const m=b.match(new RegExp(`<${n}>([\\s\\S]*?)</${n}>`,"i")); return m?m[1].trim():""; };
const allTags = (b,n)=>{ const o=[]; const re=new RegExp(`<${n}>([\\s\\S]*?)</${n}>`,"gi"); let m; while((m=re.exec(b))!==null)o.push(m[1].trim()); return o; };
const decode = s => (s||"")
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&amp;/g,"&")
  .replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"')
  .replace(/&#39;/g,"'").replace(/&apos;/g,"'").trim();

export async function onRequest() {
  let listings = [];
  try {
    const up = await fetch(FEED_URL, { cf:{ cacheTtl:900, cacheEverything:true }, headers:{ "User-Agent":"AlexisOakesSite/1.0" } });
    if (up.ok) {
      const xml = await up.text();
      const re = /<Listing>([\s\S]*?)<\/Listing>/gi; let m;
      while ((m = re.exec(xml)) !== null) {
        const b = m[1];
        const agent = tag(b,"Agent");
        const email = decode(tag(agent,"EmailAddress")).toLowerCase();
        const full = `${decode(tag(agent,"FirstName"))} ${decode(tag(agent,"LastName"))}`.toLowerCase().trim();
        if (!(email===AGENT_EMAIL || full===AGENT_NAME)) continue;
        const det = tag(b,"ListingDetails");
        const st = decode(tag(det,"Status")).toLowerCase();
        if (st && st!=="active") continue;
        const loc = tag(b,"Location"), basic = tag(b,"BasicDetails");
        listings.push({
          address: decode(tag(loc,"StreetAddress")),
          city: decode(tag(loc,"City")), state: decode(tag(loc,"State")), zip: decode(tag(loc,"Zip")),
          price: parseInt(decode(tag(det,"Price")),10)||0,
          url: decode(tag(det,"ListingUrl")), mlsId: decode(tag(det,"MlsId")),
          type: decode(tag(basic,"PropertyType")),
          beds: parseFloat(decode(tag(basic,"Bedrooms")))||null,
          baths: parseFloat(decode(tag(basic,"Bathrooms")))||null,
          sqft: parseInt(decode(tag(basic,"LivingArea")),10)||null,
          photos: allTags(tag(b,"Pictures"),"PictureUrl").map(decode).filter(Boolean).slice(0,12),
        });
      }
      listings.sort((a,b)=> b.price-a.price);
    }
  } catch (_) { /* fall through to fallback */ }

  const live = listings.length > 0;
  const out = live ? listings : FALLBACK;
  return new Response(JSON.stringify({ ok:true, source: live?"feed":"snapshot", count: out.length, listings: out }), {
    status:200,
    headers:{
      "content-type":"application/json; charset=utf-8",
      "cache-control":"public, max-age=600, s-maxage=900",
      "access-control-allow-origin":"*",
    },
  });
}
