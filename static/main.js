const map = L.map('map').setView([53.5232, -113.5263], 15);

// OpenStreetMap tiles
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);

// // Fetch microwaves when map loads
// fetch("/microwaves")
//     .then(r => r.json())
//     .then(data => {
//         data.forEach(m => {
//             const marker = L.marker([m.lat, m.lng]).addTo(map);
//             marker.bindPopup(
//                 `<b>${m.name}</b><br>` +
//                 (m.broken ? "⚠️ Broken" : "✓ Working")
//             );
//         });
//     });


async function loadMicrowaves() {
    let res = await fetch("/microwaves");
    let data = await res.json();

    data.forEach(m => {
        let marker = L.marker([m.lat, m.lng]).addTo(map);

        marker.bindPopup(`
            <b>${m.building_id}, Floor ${m.floor}</b><br>
            Status: ${m.broken ? "Broken" : "Working"}<br>
            <button onclick="markBroken(${m.id})">Mark Broken</button>
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

// async function markBroken(id) {
//     await fetch(`/microwaves/${id}/broken`, { method: "POST" });
//     location.reload();
// }

// map.on("click", async (e) => {
//     const building = prompt("Building Name");
//     const floor = prompt("Floor");
//     if (!building || !floor) return;

//     await fetch("/microwaves", {
//         method: "POST",
//         headers: {"Content-Type": "application/json"},
//         body: JSON.stringify({
//             building: building,
//             floor: floor,
//             lat: e.latlng.lat,
//             lng: e.latlng.lng
//         })
//     });

//     location.reload();
// });

loadMicrowaves();
loadBuildings();


let userMarker = null;
let closestLine = null;
let ulatlng = null;
let buildingsWithDistance = [];
let closestBuildingIndex = 0;

map.locate({ setView: true, maxZoom: 16 });
map.on("locationfound", onLocationFound);
map.on("locationerror", onLocationError);


function onLocationFound(e) {
    if (userMarker) map.removeLayer(userMarker);
    if (closestLine) map.removeLayer(closestLine);

    userMarker = L.marker(e.latlng).addTo(map);
    ulatlng = L.latLng(e.latlng.lat, e.latlng.lng);

    locateClosestBuilding();
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

header.addTo(map);
infoControl.onAdd = function () {
    this._div = L.DomUtil.create("div", "info-panel");
    this.update();
    return this._div;
};

infoControl.update = function (building = null) {
    if (!building) {
        this._div.innerHTML = "Finding nearest building...";
        return;
    }

    this._div.innerHTML = `
        <b>${building.name}</b><br>
        ${(building.distance / 1000).toFixed(2)} km away<br>
        <a href="https://www.google.com/maps?q=${building.lat},${building.lng}" 
           target="_blank" rel="noopener">
           Open in Google Maps
        </a><br><br>
        <button onclick="nextLocation()">Next Closest</button>
        <button onclick="previousLocation()">Previous Closest</button>
    `;
};



infoControl.addTo(map);


async function locateClosestBuilding() {

    buildingsWithDistance = [];
    closestBuildingIndex = 0;

    let res = await fetch("/buildings");
    let data = await res.json();
    if (!data.length) return;

    data.forEach(b => {
        let buildingLatLng = L.latLng(b.lat, b.lng);
        let tempDistance = ulatlng.distanceTo(buildingLatLng);

        buildingsWithDistance.push({
            id: b.id,
            name: b.name,
            lat: b.lat,
            lng: b.lng,
            distance: tempDistance
        });
    });

    buildingsWithDistance.sort((a, b) => a.distance - b.distance);

    showBuilding(0);
    
}

function showBuilding(index) {
    if (index < 0 || index >= buildingsWithDistance.length) return;

    closestBuildingIndex = index;
    let building = buildingsWithDistance[index];

    if (closestLine) map.removeLayer(closestLine);

    closestLine = L.polyline(
        [ulatlng, L.latLng(building.lat, building.lng)],
        { color: "red", weight: 3, opacity: 0.7 }
    ).addTo(map);

    infoControl.update(building)
}



function nextLocation() {
    let nextIndex = closestBuildingIndex + 1;

    if (nextIndex >= buildingsWithDistance.length) {
        alert("No more buildings.");
        return;
    }

    showBuilding(nextIndex);
}

function previousLocation() {
    let nextIndex = closestBuildingIndex - 1;

    if (nextIndex < 0) {
        alert("No closer building.");
        return;
    }

    showBuilding(nextIndex);
}
