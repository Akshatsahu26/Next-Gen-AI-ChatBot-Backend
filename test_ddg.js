const { search } = require("duck-duck-scrape");
async function test() {
  const result = await search("who is current cm of mp");
  console.log(result.results.slice(0, 2).map(r => r.description).join("\n"));
}
test().catch(console.error);

