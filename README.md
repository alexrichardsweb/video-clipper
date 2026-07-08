# Video Clipper

## Purpose

This is a small utility timesaving UI for **cutting long form
video into smaller clips and then stitch a selection of them back together**,
without any video editing software, uploads, or servers.

It exists to bridge the gap between *watching* a video and *running ffmpeg on
it*. Instead of scrubbing in a player, pausing and
hand-typing start/end times into a text file, you:

1. Load a local video into the browser.
2. Scrub it with fast, MPV-style keyboard shortcuts.
3. Mark the in/out points of each clip and give it a name.
4. Export the exact plain-text files your ffmpeg workflow already expects, along with the matching shell script.

Finding the right frame is quick because scrubbing is intuitive: dedicated
hotkeys jump by several lengths at once (1s, 10s, 30s, 60s) in either
direction, so you can leap across a recording and then nudge to the precise
in/out point without ever reaching for the mouse.

The app never touches your video data. The file is opened in-browser via
`URL.createObjectURL(file)` and **nothing is uploaded anywhere**. Its only
outputs are small text files:

- **`clips.txt`**: one `START END NAME` line per clip (the cut list). This will list the start and end time of your clips, along with the desired filename.
- **`files.txt`**: a concat list of the clips you selected to merge.
- **`clip.sh`**: an ffmpeg script that cuts every clip inside `clips.txt` from the source video.
- **`merge.sh`**: an ffmpeg script that concatenates selected clips.

In other words: the browser is a comfortable place to *decide* the edits, and
ffmpeg on your machine does the actual *work*. ffmpeg is a fast, scriptable, lossless engine 
for well-defined cut/merge/convert jobs, this means you can clip up and concatenate hours of footage in a few minutes instead 
of using a GUI and waiting for rendering times.

### Who it's for

Anyone who regularly slices up long recordings (captured TV, streams, lectures,
game footage) and prefers a scriptable ffmpeg pipeline over a heavy GUI editor.
It's especially handy for repetitive jobs like pulling out ad breaks or
extracting recurring segments, where consistent naming (`adverts_1`,
`adverts_2`, ...) matters.

## Run it

```bash
cd video-clipper
npm install
npm run dev
```

Then open http://localhost:3000.

## Typical workflow

1. Click **Choose video file** and pick a local video.
2. Scrub to a point, press **A** to set the start; scrub again, press **S** to
   set the end.
3. Type a **prefix** (e.g. `adverts`) and the name auto-fills to `adverts_1`.
   Leave it blank to get `clip_1`, `clip_2`, ...
4. Press **Enter** (or **Add Clip**) to add it. The next name auto-advances and
   the start jumps to the previous end for fast sequential clipping.
5. Reorder / edit / delete clips in the table (click a name to edit it, click a
   timestamp to seek the video there) and tick which clips go into `files.txt`.
6. Download or copy `clips.txt`, `files.txt`, `clip.sh`, and `merge.sh`.

Then on your machine:

```bash
bash clip.sh     # cut each clip from the source video
bash merge.sh    # concat the selected clips into merged.mp4
```

## Hotkeys (MPV-inspired)

Scrubbing is built around several seek lengths so you can move at whatever scale
the moment needs: big jumps to find the rough area, then small nudges to land on
the exact frame. Back and forward are mirrored on adjacent keys (the left key of
each pair seeks back, the right seeks forward), which makes them intuitive to
reach for without looking.

| Key       | Action              |
| --------- | ------------------- |
| `Space`   | Play / pause        |
| `,` / `.` | Seek 1s             |
| `←` / `→` | Seek 10s            |
| `k` / `l` | Seek 30s            |
| `i` / `o` | Seek 60s            |
| `A`       | Set start           |
| `S`       | Set end             |
| `Enter`   | Add clip            |

Hotkeys are ignored while typing in an input/textarea/select. Holding a seek key
scrubs quickly: seeking sets `video.currentTime` directly and is clamped to
`[0, duration]`, with no per-keypress React state update.

## Export formats

**clips.txt**

```
00:08:07 00:12:05 adverts_1
00:27:40 00:31:38 adverts_2
```

**files.txt** (selected clips only)

```
file 'adverts_1.mp4'
file 'adverts_2.mp4'
```

**clip.sh** cuts each line of `clips.txt` from the source video (the `VIDEO`
variable defaults to the loaded filename). **merge.sh** runs `ffmpeg -f concat`.

## Persistence

The clip list, video filename, prefix, and form fields are saved to
`localStorage`. On reload the list and form are restored, but the video itself
must be re-selected: browsers cannot persist local file access, so a banner
reminds you to pick the file again.

## Tech

Next.js (App Router) · React · TypeScript · Tailwind CSS. No backend and no
external services, so everything runs in the browser.

## Assumptions

- Times are second-resolution (`HH:MM:SS`); the current video time is floored
  when captured so exports are stable.
- New clips default to **included** in `files.txt`.
- `crypto.randomUUID()` is used for clip IDs (available in modern browsers).
- The `clip.sh` template re-encodes (libx264 / aac); `merge.sh` uses stream
  copy, so all clips should share a codec.
