const map = L.map('map').setView([53.5232, -113.5263], 15);

// OpenStreetMap tiles
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);

let userMarker = null;
let closestLine = null;
let ulatlng = null;
let microwavesCache = [];
let buildingsCache = [];
let microwavesWithDistance = [];
let closestMicrowaveIndex = 0;
let microwaveMarkers = {};
let addMode = false;

map.locate({ setView: true, maxZoom: 16 });
map.on("locationfound", onLocationFound);
map.on("locationerror", onLocationError);

/**
 * 
 * Load's all microwave markers onto the map.
 * 
 */
async function loadMicrowaves() {
    Object.values(microwaveMarkers).forEach(m => map.removeLayer(m));
    microwaveMarkers = {};
    

    const res = await fetch("/microwaves");
    const data = await res.json();
    microwavesCache = data;

    data.forEach(m => {
        const marker = L.marker([m.lat, m.lng]).addTo(map).bindPopup(`
            <h3>${m.building}</h3>
            ${m.description}<br>
            ${m.report_amt} users reported broken<br>
            <button onclick="reportBroken(${m.id})">Report Broken</button>
        `);

        microwaveMarkers[m.id] = marker;
    });
}

async function loadBuildingsCache() {
    buildingsCache = await fetch("/buildings").then(r => r.json());
}

/**
 * 
 * Loads all building markers onto the map.
 * 
 */
// async function loadBuildings() {
//     let res = await fetch("/buildings")
//     let data = await res.json();

//     data.forEach(b => {
//         let marker = L.marker([b.lat, b.lng]).addTo(map);

//         marker.bindPopup(`
//             <b>${b.name}</b></hr></br>
//             ${b.floors}</br>
//             Currently # of microwaves located in ${b.name}
//         `)

//     })
// }


/**
 * 
 * @param {*} id | id of microwave to report broken
 * Creates a new report object with date
 * TODO: add functionality where we only get reports from within the last 7 days
 * 
 */
async function reportBroken(id) {
    await fetch("/reports", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            microwave_id: id
        })
    });

    let m = microwavesWithDistance.find(x => x.id === id) || microwavesCache.find(x => x.id === id);
    if (!m || !microwaveMarkers[id]) return;

    m.report_amt += 1;

    microwaveMarkers[id].setPopupContent(`
        <h3>${m.building}</h3>
        ${m.description}<br>
        ${m.report_amt} users reported broken<br>
        <button onclick="reportBroken(${m.id})">Report Broken</button>
    `);

    infoControl.update(m);

}

map.on("click", async (e) => {
    if (!addMode) return;

    const building = await getClosestBuilding(e);
    const description = prompt("Description:");

    if (!description || !building) return;

    await fetch("/microwaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            building,
            description,
            lat: e.latlng.lat,
            lng: e.latlng.lng
        })
    });

    alert("Microwave submitted for review");

    addMode = false; 
});




loadBuildingsCache();
loadMicrowaves();
// loadBuildings();

/**
 * 
 * @param {*} e | this is the user location's information
 * 
 * initialize user's location and sets a marker on the map of wher ethe user is
 * calls locateClosestMicrowave() to find the closest microwave
 * 
 */
function onLocationFound(e) {
    if (userMarker) map.removeLayer(userMarker);
    if (closestLine) map.removeLayer(closestLine);

    userMarker = L.marker(e.latlng).addTo(map);
    ulatlng = L.latLng(e.latlng.lat, e.latlng.lng);

    locateClosestMicrowave();
}

/**
 * 
 * @param {*} e 
 * user declines location
 */
function onLocationError(e) {
    alert(e.message);
}

// UI ---------------------
let infoControl = L.control({ position: "bottomleft" });
let header = L.control({position: "topright"});

header.onAdd = function () {
    this._div = L.DomUtil.create("div", "header-panel");
    this._div.innerHTML = `
        <div class="header-title">University of Alberta's Microwave Map</div>
        <button id="addMicrowaveBtn">Add Microwave</button>
    `;
    return this._div;
};

header.addTo(map);

infoControl.onAdd = function () {
    this._div = L.DomUtil.create("div", "info-panel");
    this.update();
    return this._div;
};


/**
 * 
 * @param {*} microwave 
 * @returns 
 * This sets the microwave's details for the user. 
 * Allows functionality to change microwaves
 * Allows for google map directions
 * Showcases amount of people who reported the microwave broken
 * 
 */
infoControl.update = function (m) {

    if (!m) {
        this._div.innerHTML = `
            <b>Finding nearest microwave…</b>
        `;
        return;
    }

    const mapsUrl = `https://www.google.com/maps?q=${m.lat},${m.lng}`;

    this._div.innerHTML = `
        <b>Located in:</b> ${m.building}<br>
        <i>${(m.distance / 1000).toFixed(2)} km away</i> | 

        <a href="${mapsUrl}" target="_blank" rel="noopener"> Open in Google Maps </a><br><br>

        <b>Description:</b><br>
        ${m.description}<br><br>

        <b>${m.report_amt} report(s) </b> in the last 7 days.<br>
        <button class="report" onclick="reportBroken(${m.id})">Report Broken</button>

        <button onclick="previousLocation()">Previous</button>
        <button onclick="nextLocation()">Next</button>
    `;
};


infoControl.addTo(map);

/**
 * 
 * @returns 
 * This function initalizes the array microwaveswithdistance from closest to farthest
 * Also grabs the amount of reported of users who reported it broken 
 * Calls showMicrowave() which displays the current microwave
 */
async function locateClosestMicrowave() {
    // const res = await fetch("/microwaves");
    if (!ulatlng) return;

    const data = microwavesCache.length ? microwavesCache : await fetch("/microwaves").then(r => r.json());
    if (!data.length) return;

    microwavesWithDistance = data.map(m => ({
        id: m.id,
        building: m.building,
        lat: m.lat,
        lng: m.lng,
        report_amt: m.report_amt,
        description: m.description,
        distance: ulatlng.distanceTo(L.latLng(m.lat, m.lng))
    }));

    microwavesWithDistance.sort((a, b) => a.distance - b.distance);
    showMicrowave(0);
}

/**
 * temporary
 * @param {*} e 
 * @returns 
 * 
 * grabs the closest building for the microwave for it's description
 */
async function getClosestBuilding(e) {
    if (!buildingsCache.length) return null;

    let distance = Infinity;
    let buildingName = null;

    buildingsCache.forEach(b => {
        if (b.lat == null || b.lng == null) return;

        const tempDist = L.latLng(e.latlng.lat, e.latlng.lng)
            .distanceTo(L.latLng(b.lat, b.lng));

        if (tempDist < distance) {
            distance = tempDist;
            buildingName = b.name;
        }
    });

    return buildingName;
}


/**
 * 
 * @param {} index 
 * @returns 
 * 
 * Displays teh current index in the microwavesWithDistance Array, then plots a line on the map from the users' location to the microwaveß
 */
function showMicrowave(index) {
    if (index < 0 || index >= microwavesWithDistance.length) return;

    closestMicrowaveIndex = index;
    let microwave = microwavesWithDistance[index];

    if (closestLine) map.removeLayer(closestLine);

    closestLine = L.polyline(
        [ulatlng, L.latLng(microwave.lat, microwave.lng)],
        { color: "red", weight: 3, opacity: 0.7 }
    ).addTo(map);

    infoControl.update(microwave)
}

/**
 * 
 * @returns Thsese functions increase and decrease the microwave index, aswell as telling if there is no more microwaves to view.
 */
function nextLocation() {
    let nextIndex = closestMicrowaveIndex + 1;

    if (nextIndex >= microwavesWithDistance.length) {
        alert("No more microwaves.");
        return;
    }

    showMicrowave(nextIndex);
}

function previousLocation() {
    let nextIndex = closestMicrowaveIndex - 1;

    if (nextIndex < 0) {
        alert("No closer microwave.");
        return;
    }

    showMicrowave(nextIndex);
}

// Admin stuff

async function loadPending() {
    const res = await fetch("/admin/microwaves", {
        headers: { "X-ADMIN-KEY": "SECRET123" }
    });
    const data = await res.json();

    document.body.innerHTML = "<h2>Pending Microwaves</h2>";

    data.forEach(m => {
        const div = document.createElement("div");
        div.innerHTML = `
            <b>${m.building}</b><br>
            ${m.description}<br>
            <button onclick="approve(${m.id})">Approve</button>
            <button onclick="reject(${m.id})">Reject</button>
            <hr>
        `;
        document.body.appendChild(div);
    });
}

async function approve(id) {
    await fetch(`/admin/microwaves/${id}/approve`, {
        method: "POST",
        headers: { "X-ADMIN-KEY": "SECRET123" }
    });
    loadPending();
}

async function reject(id) {
    await fetch(`/admin/microwaves/${id}`, {
        method: "DELETE",
        headers: { "X-ADMIN-KEY": "SECRET123" }
    });
    loadPending();
}

document.getElementById("addMicrowaveBtn").onclick = () => {
    addMode = !addMode;

    alert(
        addMode
            ? "Click on the map to add a microwave"
            : "Add mode cancelled"
    );
};
