from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

from db import SessionLocal, init_db, seed_buildings
from models import Microwave, Report, Building
from datetime import datetime

app = Flask(__name__)
CORS(app)

init_db()
seed_buildings()

# Testing for building pins

@app.get("/buildings")
def get_buildings():
    db = SessionLocal()
    buildings = (
        db.query(Building)
        .filter(Building.lat.isnot(None), Building.lng.isnot(None))
        .all()
    )
    return jsonify([{
        "id": b.id,
        "name": b.name,
        "floors": b.floors,
        "lat": b.lat,
        "lng": b.lng
    } for b in buildings])
    
@app.get("/microwaves")
def get_microwaves():
    db = SessionLocal()
    items = db.query(Microwave).all()
    return jsonify([{
        "id": m.id,
        "building": m.building,
        "lat": m.lat,
        "lng": m.lng,
        "desc": m.description
    } for m in items])

@app.post("/microwaves")
def create_microwave():
    data = request.json
    db = SessionLocal()
    m = Microwave(
        building=data["building"],
        lat=data["lat"],
        lng=data["lng"],
        description=data["description"]
    )
    db.add(m)
    db.commit()
    print(request.json)
    return jsonify({"success": True})

@app.get("/reports")
def get_reports():
    db = SessionLocal()
    reports = db.query(Report).all()
    return jsonify([{
        "report_date": r.report_date,
        "microwave_id": r.microwave_id
    } for r in reports])

@app.post("/reports")
def create_report():
    data = request.json
    db = SessionLocal()
    report = Report(
        report_date=datetime.now(),
        microwave_id=data["microwave_id"]
    )
    db.add(report)
    db.commit()
    return jsonify({"success": True})

@app.get("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)
