const map = L.map('map').setView([53.5232, -113.5263], 15);

// OpenStreetMap tiles
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);

async function loadMicrowaves() {
    let res = await fetch("/microwaves");
    let data = await res.json();

    data.forEach(async m => {
        let marker = L.marker([m.lat, m.lng]).addTo(map);
        let amount = await amtreported(m.id);

        marker.bindPopup(`
            <h3>${m.building}</h3>
            ${m.desc}</br>
            ${amount} users reported it broken.</br>
            <button onclick="reportBroken(${m.id})">Report Broken</button>
        
        `);
    });
}

async function loadBuildings() {
    let res = await fetch("/buildings")
    let data = await res.json();

    data.forEach(b => {
        let marker = L.marker([b.lat, b.lng]).addTo(map);

        marker.bindPopup(`
            <b>${b.name}</b></hr></br>
            ${b.floors}</br>
            Currently # of microwaves located in ${b.name}
        `)

    })
}

async function reportBroken(id) {

    await fetch("/reports", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            report_date: new Date().toISOString().split('T')[0],
            microwave_id: id
        })
    });
    
    location.reload();

}
// can definitely make this faster.
async function amtreported(id) {

    let res = await fetch("/reports")
    let data = await res.json();
    let amt = 0;


    data.forEach(r => {
        if(r.microwave_id == id) {
            amt++;

        }
    })

    return amt;
}


map.on("click", async (e) => {
    const desc = prompt("Description");
    if (!desc) return;
    let closestBuilding = await getClosestBuilding(e);
    console.log("closests: ", closestBuilding);
    await fetch("/microwaves", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            building: closestBuilding,
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            description: desc
        })
    });

    location.reload();
});

loadMicrowaves();
// loadBuildings();

let userMarker = null;
let closestLine = null;
let ulatlng = null;
let microwavesWithDistance = [];
let closestMicrowaveIndex = 0;

map.locate({ setView: true, maxZoom: 16 });
map.on("locationfound", onLocationFound);
map.on("locationerror", onLocationError);

function onLocationFound(e) {
    if (userMarker) map.removeLayer(userMarker);
    if (closestLine) map.removeLayer(closestLine);

    userMarker = L.marker(e.latlng).addTo(map);
    ulatlng = L.latLng(e.latlng.lat, e.latlng.lng);

    locateClosestMicrowave();
}

function onLocationError(e) {
    alert(e.message);
}

let infoControl = L.control({ position: "bottomleft" });
let header = L.control({position: "topright"});

header.onAdd = function () {
    this._div = L.DomUtil.create("div", "header-panel");
    this._div.innerHTML = `
        University of Alberta's Microwave Map
    `;
    return this._div;
};

header.addTo(map);

infoControl.onAdd = function () {
    this._div = L.DomUtil.create("div", "info-panel");
    this.update();
    return this._div;
};

infoControl.update = function (microwave = null) {
    if (!microwave) {
        this._div.innerHTML = "Finding nearest microwave...";
        return;
    }

    this._div.innerHTML = `
        Located in: <b>${microwave.building}</b> | <i>${(microwave.distance / 1000).toFixed(2)} km away </i> <br>

        <a href="https://www.google.com/maps?q=${microwave.lat},${microwave.lng}" 
           target="_blank" rel="noopener">
           Open in Google Maps
        </a><br>
        Description: <br>
        ${microwave.description} <br><br>
        <b><i>${microwave.report_amt} users reported broken</i></b>
        <button class="report" onclick="reportBroken(${microwave.id})">Report Broken</button>
        <button onclick="nextLocation()">Next Closest</button>
        <button onclick="previousLocation()">Previous Closest</button>
    `;
};

infoControl.addTo(map);

async function locateClosestMicrowave() {

    microwavesWithDistance = [];
    closestMicrowaveIndex = 0;

    let res = await fetch("/microwaves");
    let data = await res.json();
    if (!data.length) return;

    for (const m of data) {
        let microwaveLatLng = L.latLng(m.lat, m.lng);
        let tempDistance = ulatlng.distanceTo(microwaveLatLng);
        let amt = await amtreported(m.id);

        microwavesWithDistance.push({
            id: m.id,
            building: m.building,
            lat: m.lat,
            lng: m.lng,
            report_amt: amt,
            description: m.desc,
            distance: tempDistance
        });
    };

    microwavesWithDistance.sort((a, b) => a.distance - b.distance);

    showMicrowave(0);
    
}

async function getClosestBuilding(e){
    let res = await fetch("/buildings");
    let data = await res.json();
    if(!data.length) return;

    let distance = Infinity;
    let buildingName = null;

    data.forEach(b => {

        if(b.lat == null || b.lng == null) return;

        let buildingLatLng = L.latLng(b.lat, b.lng);
        let templatLng = L.latLng(e.latlng.lat, e.latlng.lng);
        let tempDist = templatLng.distanceTo(buildingLatLng);
        if(tempDist < distance) {
            distance = tempDist;
            buildingName = b.name;
        }
    })

    return buildingName;
}

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
