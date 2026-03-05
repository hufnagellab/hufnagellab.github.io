const map = L.map("map").setView([40, -95], 4);

const markers = L.markerClusterGroup({
  maxClusterRadius: 40
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 18
}).addTo(map);

map.addLayer(markers);

const panelTitle = document.getElementById("panelTitle");
const panelMeta = document.getElementById("panelMeta");
const awardeeList = document.getElementById("awardeeList");

const searchInput = document.getElementById("search");
const programFilter = document.getElementById("programFilter");
const yearFilter = document.getElementById("yearFilter");

let rawData = [];
let markersByKey = new Map(); // key => { marker, items, meta }

function locationKey(d) {
  // group by institution + city (you can change to exact lat/lon if preferred)
  return `${d.institution}||${d.city}||${d.region}||${d.country}`;
}

function renderPanel(group) {
  panelTitle.textContent = group.meta.institution;
  panelMeta.textContent = `${group.meta.city}, ${group.meta.region || ""} ${group.meta.country}`.replace(/\s+/g, " ").trim();

  awardeeList.innerHTML = "";
  const items = group.items.slice().sort((a,b) => b.year - a.year);

  for (const d of items) {
    const li = document.createElement("li");
    li.className = "card";
    li.innerHTML = `
      <div class="name">${escapeHtml(d.name)}</div>
      <div class="small">${d.program} — ${d.year}</div>
      <div class="small">${escapeHtml(d.info || "")}</div>
      <div class="tag">${escapeHtml(d.city)}, ${escapeHtml(d.country)}</div>
    `;
    awardeeList.appendChild(li);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
  }[m]));
}

function populateFilters(data) {
  const programs = Array.from(new Set(data.map(d => d.program))).sort();
  const years = Array.from(new Set(data.map(d => d.year))).sort((a,b)=>b-a);

  for (const p of programs) {
    const opt = document.createElement("option");
    opt.value = p; opt.textContent = p;
    programFilter.appendChild(opt);
  }
  for (const y of years) {
    const opt = document.createElement("option");
    opt.value = String(y); opt.textContent = String(y);
    yearFilter.appendChild(opt);
  }
}

function applyFilters() {
  const q = searchInput.value.trim().toLowerCase();
  const p = programFilter.value;
  const y = yearFilter.value;

  // For each marker-group, filter its items; show/hide marker accordingly
  for (const [key, group] of markersByKey.entries()) {
    const filtered = group.itemsAll.filter(d => {
      const matchQ = !q || [
        d.name, d.institution, d.city, d.region, d.country, d.program, String(d.year), d.info
      ].filter(Boolean).join(" ").toLowerCase().includes(q);

      const matchP = !p || d.program === p;
      const matchY = !y || String(d.year) === y;

      return matchQ && matchP && matchY;
    });

    group.items = filtered;

    if (filtered.length === 0) {
      map.removeLayer(group.marker);
    } else {
      if (!map.hasLayer(group.marker)) markers.addLayer(group.marker);
      // update popup count
      group.marker.bindPopup(`
        <b>${escapeHtml(group.meta.institution)}</b><br/>
        ${escapeHtml(group.meta.city)}, ${escapeHtml(group.meta.country)}<br/>
        <b>${filtered.length}</b> awardee(s) match filters
      `);
    }
  }
}

function buildMarkers(data) {
  markersByKey.clear();

  for (const d of data) {
    const key = locationKey(d);
    if (!markersByKey.has(key)) {
      markersByKey.set(key, {
        itemsAll: [],
        items: [],
        meta: {
          institution: d.institution,
          city: d.city,
          region: d.region,
          country: d.country,
          lat: d.lat,
          lon: d.lon
        },
        marker: null
      });
    }
    markersByKey.get(key).itemsAll.push(d);
  }

  for (const [key, group] of markersByKey.entries()) {
    group.items = group.itemsAll.slice();

    const marker = L.marker([
  parseFloat(group.meta.lat),
  parseFloat(group.meta.lon)
]);

    marker.bindPopup(`
      <b>${escapeHtml(group.meta.institution)}</b><br/>
      ${escapeHtml(group.meta.city)}, ${escapeHtml(group.meta.country)}<br/>
      <b>${group.items.length}</b> awardee(s)
    `);

    marker.on("click", () => renderPanel(group));
    markers.addLayer(marker);
  }
}

async function init() {
const res = await fetch("https://opensheet.elk.sh/1H8GH6SO7q3KpdUluybu2iMK9meYrx-FAH2KTkpb7glc/Sheet1");
  rawData = await res.json();

  populateFilters(rawData);
  buildMarkers(rawData);

  // Fit bounds to markers
  const latlngs = rawData.map(d => [d.lat, d.lon]);
  if (latlngs.length) map.fitBounds(latlngs, { padding: [30, 30] });

  // Hook filters
  searchInput.addEventListener("input", applyFilters);
  programFilter.addEventListener("change", applyFilters);
  yearFilter.addEventListener("change", applyFilters);
}

init();
