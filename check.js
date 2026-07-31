(async () => {
  const r = await fetch('https://collabcode-hu9d.onrender.com');
  const html = await r.text();
  const match = html.match(/src=\"(\/assets\/index-[^\"]+\.js)\"/);
  if (!match) return console.log('NO JS FILE FOUND');
  console.log('Found JS:', match[1]);
  const jsR = await fetch('https://collabcode-hu9d.onrender.com' + match[1]);
  const js = await jsR.text();
  console.log('Contains Clerk Key?', js.includes('VITE_CLERK_PUBLISHABLE_KEY') ? 'YES' : 'NO');
  console.log('Contains pk_test?', js.includes('pk_test') || js.includes('pk_live') ? 'YES' : 'NO');
})();
