# Background music

`pad.flac` is a 32-second ambient pad (Cmaj9 – Am7 – Fmaj7 – Gsus2) that loops seamlessly. It was synthesized from scratch by [`pipeline/scripts/generate-pad.js`](../../../scripts/generate-pad.js): no samples or third-party music are involved, so it is covered by this repository's MIT license and does not trigger YouTube Content ID claims.

The pipeline mixes it under the voice with reverb, a fade in/out and sidechain ducking (see `pipeline/src/video.js`).
