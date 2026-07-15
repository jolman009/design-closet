
/
Design Closet
Design Closet
An app that suggests daily wardrope based on the upload clothes in your personal closet.




How can I help you today?



Recents
Wardrobe suggestion app
ELÉVATION app delivered; closet/outfits/events persisting on design-closet
16 minutes ago
Instructions
Add instructions to tailor Claude’s responses

Memory
Only you
Project memory will show here after a few chats.

Context
1% of project capacity used

claude
1 item

Scheduled
Set up recurring tasks for this project.


Context
1 item

Search files

claude

elevation-app-notes.md
elevation-app-notes.md


# ELÉVATION — Smart Wardrobe Stylist (build notes)
 
**Status:** v1 delivered 2026-07-15 as a single-file web app (`elevation.html`), built from the uploaded Stitch design zip ("stitch_smart_wardrobe_stylist").
 
## What the app does
- **Home** — daily outfit suggestion driven by live weather (Open-Meteo + geolocation), upcoming events, recent closet additions.
- **Closet** — photo-first grid with category filters, favorites, add/edit/remove pieces.
- **Add item ("New Treasure")** — camera capture or photo library, automatic color tagging read from the photo, plus category/season/fabric/formality/warmth attributes.
- **Outfits** — occasion picker (Work, Date Night, Casual, Formal, Active, Travel) with a rule-based generator that scores pieces on formality fit, warmth vs. current temperature, season, favorites, and palette match. Save looks to a collection.
- **Events** — built-in schedule; "Plan Outfit" generates and attaches a look to each event.
- **Profile** — style persona, preferred palette, sizes, style goals checklist.
- **Themes** — Feminine (cream/sage boutique) and Masculine (charcoal/bronze noir) toggle, persisted per the Stitch designs.
## Backend (Supabase)
- Project: **design-closet**, ref `tifnqeujvdhhwpvhvycn`, region us-east-2, org "jolman009's Team".
- Tables: `closet_items`, `closet_events`, `closet_outfits`, `closet_profile` (single-row) — all RLS-enabled with permissive anon policies (no user accounts yet).
- Storage: public bucket `closet-photos` for clothing photos (client resizes to ≤1080px JPEG before upload).
- The app talks to Supabase via plain REST (PostgREST + Storage API) with the anon key embedded in the HTML.
## Decisions / history
- receipt-radar project was **paused** to free the free-tier slot (2-active-project limit); design-closet was created in its place.
- A schema was briefly added to book-library then fully reverted; one leftover: an **empty `closet-photos` bucket in book-library** (SQL can't delete buckets — remove via dashboard if desired).
- Security note: the anon key + open policies mean anyone with the key could read/write closet data. Fine for personal use; add Supabase Auth + per-user RLS before sharing publicly.
- Pre-seeded with 17 sample wardrobe pieces, 3 events, and a profile so the generator works out of the box.
## Ideas for v2
- Supabase Auth with per-user closets and stricter RLS.
- Google Calendar connector instead of the built-in event list.
- Real AI tagging (vision model) for fabric/category detection from photos.
- Wear-tracking ("worn today") to rotate suggestions and surface neglected pieces.
 
