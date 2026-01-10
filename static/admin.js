const map = L.map('map').setView([53.5232, -113.5263], 15);

// OpenStreetMap tiles
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);


async function loadPending() {
    const res = await fetch("/admin/api/microwaves");
    const data = await res.json();

    const list = document.getElementById("list");
    list.innerHTML = "";

    data.forEach(m => {
        const div = document.createElement("div");
        div.innerHTML = `
            <b>${m.building}</b><br>
            ${m.description}<br>
            <button onclick="approve(${m.id})">Approve</button>
            <button onclick="reject(${m.id})">Reject</button>
            <hr>
        `;
        list.appendChild(div);
    });
}

async function approve(id) {
    await fetch(`/admin/api/microwaves/${id}/approve`, { method: "POST" });
    loadPending();
}

async function reject(id) {
    await fetch(`/admin/api/microwaves/${id}`, { method: "DELETE" });
    loadPending();
}

function logout() {
    window.location = "/admin/logout";
}

loadPending();