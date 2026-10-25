// Scratch: measure a pending-post config's copy against the length budgets in
// docs/content-templates/copy-voice.md §8, so a CTA overprint or a three-line
// room caption is caught before the build rather than after. Safe to delete.
const c = require(`./data/pending/${process.argv[2]}.ts`).default;
const row = (label: string, s: string, cap: number) =>
  console.log(`${label.padEnd(20)} ${String(s.length).padStart(3)}/${cap} ${s.length <= cap ? "OK" : "OVER"}`);
console.log("key", c.listingKey, "| hook", JSON.stringify(c.hook), "| accent", c.accentColor);
row("coverBody", c.coverBody, 260);
c.rooms.forEach((r: any) => row(`room:${r.room}`, r.caption, 90));
row("fallbackCaption", c.fallbackCaption, 90);
c.textPosts.forEach((t: any, i: number) =>
  t.paragraphs.forEach((p: string, j: number) => row(`text${i + 1}.p${j + 1}`, p, 220))
);
c.cta.paragraphs.forEach((p: string, j: number) => row(`cta.p${j + 1}`, p, 110));
console.log("cta paragraphs:", c.cta.paragraphs.length, c.cta.paragraphs.length === 2 ? "OK" : "MUST BE 2");
