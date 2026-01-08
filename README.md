# University of Alberta Microwave Map
[Website](https://ualbertamicrowaves.onrender.com)

An interactive web application that helps students find the nearest working microwave on the University of Alberta campus. The system uses real-time geolocation, distance-based sorting, and user reports to surface the most convenient microwave locations.

---

## Features

- Real-time user location using browser geolocation
- Distance-based sorting to find the closest microwave
- Interactive Leaflet map with route visualization
- Building information and microwave descriptions
- "Report Broken" functionality for unavailable microwaves
- Navigation between next and previous closest locations
- One-click navigation to Google Maps

---

## Tech Stack

Frontend
- JavaScript (ES6)
- Leaflet.js
- HTML / CSS

Backend
- Python (Flask)
- RESTful API
- SQL database

Deployed using Render

---

## Project Structure

- static/
  - style.css
  -  main.js
- templates/
  - admin.html
  - admin_login.html
  - index.html
- app.py
- models.py
- db.py
- database.db
- README.md
- requirements.txt

## API Endpoints

| Endpoint        | Method | Description                   |
|-----------------|--------|-------------------------------|
| /microwaves     | GET    | Retrieve microwave locations  |
| /buildings      | GET    | Retrieve building data        |
| /report/<id>    | POST   | Report a broken microwave     |


## How It Works

1. The application retrieves the user's current location using browser geolocation.
2. Microwave distances are calculated using Leaflet's distance utilities.
3. Microwaves are sorted by proximity.
4. The closest microwave is displayed with navigation and reporting options.
5. Users and add microwaves, report broken microwaves, and get directions to the microwave of their choosing
6. Admins can approve/reject microwave submissions

## Future Improvements

- User authentication for reporting validation
- Analytics on frequently reported microwaves
- Mobile and accessibility improvements
- Indoor and floor-level microwave locations

---

## Author

Kyle Nguyen  
University of Alberta
