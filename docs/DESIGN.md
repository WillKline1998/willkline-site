# Design Direction (from Will, 2026-10-07 voice memo)

## The feel
Nostalgic **self-hosted classical-artist website**: the site a rising soloist has, built by an engineering-student friend rather than an agency. Not crappy, but with that charm: personal, hand-built, a little old-web. Think of Googling the guest soloist before rehearsal.

## Structure (confirmed)
- Artist-page organization: content column + **navigation on the side**.
- **Home page is NOT a hero photo with a big name.** Will has few photos, wants more UI design. Home = a **bulletin board / playground** that the admin posts to: "show coming up on <date>," "new album out," "album coming soon," anything, each post optionally linking deeper into the site.

## References
- **Jeffrey Turner** (former principal bass, Pittsburgh Symphony; IU faculty; Will's teacher): jeffreyturner.net. Georgia-style serif, small-caps top nav (HOME / BIOGRAPHY / MEDIA / CONTACT), name + "Bassist / Conductor / Educator" stacked in serif over a full-bleed photo. Quiet, classic, understated. Screenshot: research/ref_jeffreyturner.net.png
- **Marguerite (Maggie) Cox** (bassist, NYC; Will's friend): margueritecox.com. Squarespace, lavender/purple tint, centered name, nav split left. Under the hero: press quotes, then an **"Upcoming Performances" list (date / venue / ensemble / Read more →)**. That list is close to Will's bulletin idea. Screenshot: research/ref_margueritecox.com.png
- **Kurt Muroki** (IU bass professor; Will's teacher; built his own site): muroki.com/wp/?page_id=5 (http only). WordPress Twenty Fourteen: black left sidebar with Recent Posts / Pages / Archives, green accent, Lato, one narrow text column with photos floated right. The blog-style sidebar (recent posts + archives) is a nice fit for the bulletin board. Screenshot: research/ref_muroki.com.png

## Decision (2026-10-07)
**Quiet Studio** (theme C) chosen: white, Geist sans + mono labels, one orange accent (#c2410c), soft panels. The nostalgic charm should come through in content and small details, not a retro skin. Recital and Self-Hosted '07 remain in git history (commit c17f2c9).

## Bulletin attachments (Will: "represented faithfully")
Images inline; YouTube/Vimeo/Spotify/SoundCloud as real players; direct mp4 as <video>; PDFs as an inline preview + file card; anything else as a link card. Only allowlisted providers get iframes (src/lib/embeds.ts).

## Takeaways
- Serif typography (Georgia/Garamond family), small-caps labels, generous whitespace, restrained color.
- Dated lists of events (performance-listing convention) work well for the bulletin board.
- Hand-built charm can come from details: borders, a fixed-width column, visited-link colors, a "last updated" footer, a hit counter (in demo mode?).
