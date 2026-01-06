# High Level Tasks

Do Next

- Tidy up traktor collection
  - Properly tag files
  - Remove orphans and look for any files only in bulk ALL type playlists
  - Upgrade traktor
  - Move all folders
- Add plex integration to compare discogs to vinyl collection
- Add create youtube playlist from playlist
- Add all new vinyl to discogs collection

- Add better Traktor collection search and filtering to app for when djing
  Key, BPM, Title, Artist, Release searches

Today

- Confirm editing traktor collection works

- DONE Add create playlist from discogs collection
- WORKAROUND Add create playlist from shazam
  DEFER - I dont seem to be able to find my tracks in shazam web. I have emailed for my data, lets see
  DONE - Pragmatic answer - connect shazam to spotify, it syncs to a playlist. Gets me the tracks to now, but not once my spotify trial ends

- DONE Add Google auth provider

SOURCE OF TRUTH FOR ALL VINYL - DISCOGS -> PLEX
Process for keeping Vinyl up to date:

- Scan all vinyl in to Discogs
- Find all vinyl not in Plex
- Add all new vinyl to Plex - what is the best way to tag Vinyl in Plex? Currently in a playlist but that is not great
- Find all vinyl in Plex not in Discogs
- Find all vinyl in Plex but not in Traktor
- Add all new vinyl to Traktor

Noz process

- Add all Monthly Mixes to Youtube Music playlists
- Add all tracks to monthly playlists via shazam
- Download all tracks in monthly playlist and add to PLex as compliations
  Could add details of any missing files to compilation meta data?

- [x] **Add other auth providers** (google at least)

## Traktor

- [x] Fix collection upload and persistence
- [ ] More powerful traktor tools
  - [ ] Find songs in the fewest playlists
  - [ ] Find playlist that contains the most songs that are only in that playlist

## Playlist Tools

- [ ] Create youtube music playlist from playlist
- [ ] Support shazam link to create playlist
- [x] Open playlist in soulseek clone
- [x] Support create playlist from discogs collection

## Soulseek Clone Route

- [x] Set up server
- [x] Set up tunnel
- [x] Use existing ui to download songs
- [x] Create bespoke features to download whole playlist of songs
- [ ] AI Search expand isnt really doing anything i think
- [ ] Allow search results to show in badvibes

## Shazam Route (or just make playlist tools take a shazam url?)

- [ ] Create Shazam scraper
- [ ] Create shazam auto playlist from audio (youtube music track)

- [ ] Lock down soulseek and bad-vibes routes to only my email
