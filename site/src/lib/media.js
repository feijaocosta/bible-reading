// Maps media stored in GitHub Releases to the copy served by GitHub Pages (see scripts/fetch-media.js).
// https://github.com/<owner>/<repo>/releases/download/<tag>/<file>  ->  /audio/<tag>/<file>
const RELEASE = /^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\/([^/]+)\/([^/?#]+)$/;

export function isReleaseAsset(url) {
  return RELEASE.test(String(url));
}

export function mediaPath(url) {
  const m = RELEASE.exec(String(url));
  return m ? `/audio/${m[1]}/${m[2]}` : url;
}
