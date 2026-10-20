# Family assets

The memorial works with **no files in this folder**: the portrait, house, plaques and rooms are all
generated procedurally. Drop real files here when you have them.

## Portrait

1. Copy a photo into this folder, e.g. `public/assets/portrait.jpg` (portrait orientation, roughly 4:5,
   at least 1000 px tall; JPEG/WebP, under ~500 KB is ideal).
2. Edit `manifest.json`:

   ```json
   {
     "portrait": "portrait.jpg",
     "portraitAlt": "Eleanor in her garden, smiling"
   }
   ```

The portrait is then used on the home page, on the wall of the memorial room in the 3D house, and in the final room.

Priority: **portrait set in the admin Config page** (served by the API) → this manifest → generated art.
Absolute `https://` URLs are also accepted in `manifest.json`.

If the file is missing or the manifest is invalid, the generated portrait is used. Nothing breaks.

## What is *not* wired (be aware)

- **3D model (`.glb`) of a real house:** not loaded. The house is built from code in
  `src/experience/Exterior.tsx` and `Interior.tsx`. Replacing it would mean adding a `useGLTF` loader to those components.
- **Hero / house photographs:** not displayed anywhere. Use the admin Gallery for photographs.
- **Audio:** the memorial never plays audio and there is no audio asset slot.

## Notes

- Files in `public/assets/` are served as-is at `/assets/…`. Built JS/CSS goes to `/static/…`, so the two never collide.
- The 3D scene draws images to a canvas, so images must be same-origin (as these are) or sent with CORS headers.
  Tribute photos hosted on the object store (R2/S3) need `Access-Control-Allow-Origin` for this site's origin to appear on
  the 3D plaques; without it, plaques fall back to initials and the photo still shows in the reading window.
