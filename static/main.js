const map = L.map('map').setView([53.5232, -113.5263], 15);

// OpenStreetMap tiles
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);

let userMarker = null;
let closestLine = null;
let ulatlng = null;
let microwavesWithDistance = [];
let closestMicrowaveIndex = 0;

map.locate({ setView: true, maxZoom: 16 });
map.on("locationfound", onLocationFound);
map.on("locationerror", onLocationError);

/**
 * 
 * Load's all microwave markers onto the map.
 * 
 */
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

/**
 * 
 * Loads all building markers onto the map.
 * 
 */
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
            report_date: new Date().toISOString().split('T')[0],
            microwave_id: id
        })
    });
    
    location.reload();

}

// can definitely make this faster.
/**
 * 
 * @param {*} id | microwave id
 * @returns amt | Amt of broken reports
 * TODO: only return amount of broken reports in the last 7 days
 */
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

/**
 * 
 * Temporarily allow for microwaves to be added on map clicks,
 * prompts user to add a description
 */
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

/**
 * 
 * @returns 
 * This function initalizes the array microwaveswithdistance from closest to farthest
 * Also grabs the amount of reported of users who reported it broken 
 * Calls showMicrowave() which displays the current microwave
 */
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

/**
 * temporary
 * @param {*} e 
 * @returns 
 * 
 * grabs the closest building for the microwave for it's description
 */
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
        return;ß
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
