import { permanentRedirect } from 'next/navigation'

// /listings used to be a full-page iframe of joseph.obsidianregroup.com — the
// Obsidian Group's IDX search. That dependency left with the brokerage, and an
// iframe of a host we no longer have an account on renders an empty page to
// every visitor with no error we'd ever see.
//
// The platform's own MLS map search at /mls-listings is the replacement. A 308
// keeps the accumulated SEO value of /listings (it ranks for "Palm Desert homes
// for sale") pointed at the page that now does the job.
export default function Listings() {
  permanentRedirect('/mls-listings')
}
