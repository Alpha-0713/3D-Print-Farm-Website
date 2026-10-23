export function partArtwork(kind = "bracket", extra = "") {
  const id = `part-${kind}`;
  let drawing;
  if (kind === "lattice") drawing = `<path d="M120 131c5-48 46-81 96-73 45 7 64 46 42 82-24 38-14 72-56 84-47 14-91-21-82-62zm38 9c-2 18 11 29 26 28 15-1 18-15 28-30 10-16 2-27-11-28-22-2-41 13-43 30z" fill="url(#${id}-metal)" stroke="#c4cac1" stroke-width="2"/>\
<path d="M125 120l33 20m-5-55 32 46m12-69 3 68m30-55-23 55m51-26-34 28m16 36-39-24m-6 53-5-49m-46 38 24-34" stroke="#5c635e" stroke-width="7" opacity=".75"/>`;
  else if (kind === "case") drawing = `<path d="M98 132l77-48 128 25-77 53z" fill="#aeb5ac"/>\
<path d="M98 132v82l128 30v-82z" fill="#737b74"/>\
<path d="M226 162v82l77-49v-86z" fill="#555d57"/>\
<path d="M126 143l72 17v29l-72-17zm0 44 72 17v12l-72-17z" fill="#202520"/>\
<path d="M169 84l-1 77m135-52-77 53" stroke="#d6d9d3" stroke-width="2" opacity=".55"/>`;
  else drawing = `<path d="M139 76h80c11 0 19 8 19 19v74l119 72c14 9 8 30-9 30H99c-13 0-21-14-14-25l43-70V96c0-12 0-20 11-20z" fill="url(#${id}-metal)" stroke="#bdc4bc" stroke-width="2"/>\
<path d="M145 94h77v88l-34 54h-93l50-72z" fill="#666e68"/>\
<path d="M222 181l114 67h-93l-40-64z" fill="#474e49"/>\
<path d="M226 180l78 46" stroke="#b0b7af" stroke-width="9" opacity=".8"/>\
<ellipse cx="170" cy="111" rx="13" ry="16" fill="#141815"/>\
<ellipse cx="170" cy="163" rx="13" ry="16" fill="#141815"/>\
<ellipse cx="126" cy="231" rx="14" ry="9" fill="#161a17"/>\
<ellipse cx="300" cy="257" rx="14" ry="9" fill="#161a17"/>\
<ellipse cx="252" cy="255" rx="14" ry="9" fill="#161a17"/>\
<path d="M151 92h68m-95 149h205" stroke="#e0e4dd" stroke-width="2" opacity=".5"/>`;
  return `<div class="art-frame ${extra}" role="img" aria-label="${kind === "lattice" ? "A detailed lattice printed component" : kind === "case" ? "A layered printed enclosure concept" : "A gray 3D printed mounting bracket"}">\
  <svg viewBox="0 0 400 320" aria-hidden="true">\
    <defs>\
      <linearGradient id="${id}-metal" x1=".1" y1="0" x2=".9" y2="1">\
        <stop stop-color="#d0d5cf"/>\
        <stop offset=".45" stop-color="#8e9690"/>\
        <stop offset="1" stop-color="#535b56"/>\
      </linearGradient>\
      <filter id="${id}-shadow" x="-30%" y="-30%" width="160%" height="170%">\
        <feDropShadow dx="0" dy="15" stdDeviation="12" flood-color="#000" flood-opacity=".55"/>\
      </filter>\
    </defs>\
    <g filter="url(#${id}-shadow)">\
      ${drawing}\
    </g>\
  </svg>\
  <span class="art-grid" aria-hidden="true">\
  </span>\
</div>`;
}

