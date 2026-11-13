import fs from "node:fs";
import zlib from "node:zlib";

for (const page of ["index", "treasury", "admins", "admins/_not-found"]) {
  const htmlPath = `.next/server/app/${page}.html`;
  if (!fs.existsSync(htmlPath)) continue;
  const html = fs.readFileSync(htmlPath, "utf8");
  const scripts = [...html.matchAll(/src="\/_next\/(static\/chunks\/[^"]+)"/g)].map(
    (m) => `.next/${m[1]}`,
  );
  let raw = 0;
  let gz = 0;
  for (const f of new Set(scripts)) {
    const b = fs.readFileSync(f);
    raw += b.length;
    gz += zlib.gzipSync(b).length;
  }
  console.log(
    `${page.padEnd(18)} chunks=${scripts.length}  raw=${(raw / 1024).toFixed(1)} KiB  gzip=${(gz / 1024).toFixed(1)} KiB`,
  );
}

