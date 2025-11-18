const map = L.map('map').setView([53.5232, -113.5263], 15);

// OpenStreetMap tiles
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);

// Fetch microwaves when map loads
fetch("/microwaves")
    .then(r => r.json())
    .then(data => {
        data.forEach(m => {
            const marker = L.marker([m.lat, m.lng]).addTo(map);
            marker.bindPopup(
                `<b>${m.name}</b><br>` +
                (m.broken ? "⚠️ Broken" : "✓ Working")
            );
        });
    });


async function loadMicrowaves() {
    let res = await fetch("/microwaves");
    let data = await res.json();

    data.forEach(m => {
        let marker = L.marker([m.lat, m.lng]).addTo(map);

        marker.bindPopup(`
            <b>${m.name}</b><br>
            Status: ${m.broken ? "❌ Broken" : "✅ Working"}<br>
            <button onclick="markBroken(${m.id})">Mark Broken</button>
        `);
    });
}

async function markBroken(id) {
    await fetch(`/microwaves/${id}/broken`, { method: "POST" });
    location.reload();
}

map.on("click", async (e) => {
    const name = prompt("Microwave name?");
    if (!name) return;

    await fetch("/microwaves", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            name: name,
            lat: e.latlng.lat,
            lng: e.latlng.lng
        })
    });

    location.reload();
});

loadMicrowaves();
