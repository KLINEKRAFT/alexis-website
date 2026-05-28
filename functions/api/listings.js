// Cloudflare Pages Function — GET /api/listings
// Fetches the Coldwell Banker Select Zillow XML feed server-side (avoids
// mixed-content + CORS in the browser), filters to Alexis Oakes' active
// listings, and returns a compact JSON payload. Cached at the edge.

const FEED_URL = "http://realistiq.net/exports/iq_cb_select_zillow.xml";

// Match Alexis by agent email (most reliable) or full name.
const AGENT_EMAIL = "aoakes@cbtulsa.com";
const AGENT_NAME = "alexis oakes";

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].trim() : "";
}
function allTags(block, name) {
  const out = [];
  const re = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "gi");
  let m;
  while ((m = re.exec(block)) !== null) out.push(m[1].trim());
  return out;
}
function decode(s) {
  return (s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

export async function onRequest(context) {
  try {
    const upstream = await fetch(FEED_URL, {
      cf: { cacheTtl: 900, cacheEverything: true },
      headers: { "User-Agent": "AlexisOakesSite/1.0" },
    });
    if (!upstream.ok) {
      return json({ ok: false, error: `feed ${upstream.status}`, listings: [] }, 502);
    }
    const xml = await upstream.text();

    const listings = [];
    const re = /<Listing>([\s\S]*?)<\/Listing>/gi;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const b = m[1];
      const agent = tag(b, "Agent");
      const email = decode(tag(agent, "EmailAddress")).toLowerCase();
      const fname = decode(tag(agent, "FirstName"));
      const lname = decode(tag(agent, "LastName"));
      const fullName = `${fname} ${lname}`.toLowerCase().trim();

      const isAlexis = email === AGENT_EMAIL || fullName === AGENT_NAME;
      if (!isAlexis) continue;

      const loc = tag(b, "Location");
      const det = tag(b, "ListingDetails");
      const basic = tag(b, "BasicDetails");
      const status = decode(tag(det, "Status")).toLowerCase();
      if (status && status !== "active") continue;

      const pics = allTags(tag(b, "Pictures"), "PictureUrl").map(decode).filter(Boolean);

      listings.push({
        address: decode(tag(loc, "StreetAddress")),
        unit: decode(tag(loc, "UnitNumber")),
        city: decode(tag(loc, "City")),
        state: decode(tag(loc, "State")),
        zip: decode(tag(loc, "Zip")),
        lat: parseFloat(decode(tag(loc, "Lat"))) || null,
        lng: parseFloat(decode(tag(loc, "Long"))) || null,
        price: parseInt(decode(tag(det, "Price")), 10) || 0,
        url: decode(tag(det, "ListingUrl")),
        mlsId: decode(tag(det, "MlsId")),
        tour: decode(tag(det, "VirtualTourUrl")),
        type: decode(tag(basic, "PropertyType")),
        description: decode(tag(basic, "Description")),
        beds: parseFloat(decode(tag(basic, "Bedrooms"))) || null,
        baths: parseFloat(decode(tag(basic, "Bathrooms"))) || null,
        sqft: parseInt(decode(tag(basic, "LivingArea")), 10) || null,
        lot: decode(tag(basic, "LotSize")),
        yearBuilt: decode(tag(basic, "YearBuilt")),
        photos: pics.slice(0, 20),
      });
    }

    // Newest-ish first: highest price as a stable proxy (feed has no list date)
    listings.sort((a, b) => b.price - a.price);

    return json({ ok: true, count: listings.length, listings }, 200);
  } catch (err) {
    return json({ ok: false, error: String(err), listings: [] }, 500);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=900",
      "access-control-allow-origin": "*",
    },
  });
}
