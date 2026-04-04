import 'dotenv/config';

const fetch = globalThis.fetch;

async function doTest() {
  console.log("Testing full POST loop...");
  const res = await fetch('http://localhost:3000/api/seed', {method:'POST'});
  console.log("Result", res.status);
  const data = await res.json();
  console.log("Data", data);
}

doTest();
