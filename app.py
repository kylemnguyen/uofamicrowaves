import os
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_cors import CORS
from datetime import datetime, timedelta
from sqlalchemy import func, and_

from db import SessionLocal, init_db, seed_buildings
from models import Microwave, Report, Building

app = Flask(__name__)
CORS(app)

app.secret_key = os.getenv("FLASK_SECRET_KEY")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

if os.getenv("RENDER"):
    init_db()
    seed_buildings()
    
# Admin Login
@app.get("/admin/login")
def admin_login_page():
    return render_template("admin_login.html")

@app.post("/admin/login")
def admin_login():
    password = request.form.get("password")

    if password != ADMIN_PASSWORD:
        return render_template("admin_login.html", error="Wrong password")

    session["is_admin"] = True
    return redirect("/admin")

@app.get("/admin/logout")
def admin_logout():
    session.clear()
    return redirect("/admin/login")

@app.get("/admin")
def admin_panel():
    if not session.get("is_admin"):
        return redirect("/admin/login")
    return render_template("admin.html")

@app.get("/buildings")
def get_buildings():
    db = SessionLocal()
    buildings = (
        db.query(Building)
        .filter(Building.lat.isnot(None), Building.lng.isnot(None))
        .all()
    )

    result = [{
        "id": b.id,
        "name": b.name,
        "floors": b.floors,
        "lat": b.lat,
        "lng": b.lng
    } for b in buildings]

    db.close()
    return jsonify(result)

@app.get("/microwaves")
def get_microwaves():
    db = SessionLocal()
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    rows = (
        db.query(
            Microwave.id,
            Microwave.lat,
            Microwave.lng,
            Microwave.description,
            Building.name.label("building"),
            func.count(Report.id).label("report_amt")
        )
        .join(Building, Microwave.building_id == Building.id)
        .outerjoin(
            Report,
            and_(
                Report.microwave_id == Microwave.id,
                Report.report_date >= seven_days_ago
            )
        )
        .filter(Microwave.approved == True)
        .group_by(
            Microwave.id,
            Building.name
        )
        .all()
    )

    return jsonify([
        {
            "id": id,
            "lat": lat,
            "lng": lng,
            "description": description,
            "building": building,
            "report_amt": report_amt
        }
        for id, lat, lng, description, building, report_amt in rows
    ])



# @app.post("/microwaves")
# def create_microwave():
#     data = request.json
#     db = SessionLocal()

#     building = (
#         db.query(Building)
#         .filter(Building.name == data["building"])
#         .first()
#     )

#     if not building:
#         db.close()
#         return jsonify({"error": "Building not found"}), 400

#     m = Microwave(
#         building_id=building.id,
#         lat=data["lat"],
#         lng=data["lng"],
#         description=data["description"]
#     )

#     db.add(m)
#     db.commit()
#     db.refresh(m)

#     response = {
#         "id": m.id,
#         "lat": m.lat,
#         "lng": m.lng,
#         "description": m.description,
#         "building": building.name,
#         "report_amt": 0
#     }

#     db.close()
#     return jsonify(response)

#Report Creation and Fetch
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
        microwave_id=data["microwave_id"]
    )

    db.add(report)
    db.commit()
    db.close()

    return jsonify({"success": True})


#Microwave Submissions
@app.post("/microwaves")
def submit_microwave():
    data = request.json
    db = SessionLocal()

    building = db.query(Building).filter_by(name=data["building"]).first()
    if not building:
        db.close()
        return {"error": "Invalid building"}, 400

    m = Microwave(
        building_id=building.id,
        lat=data["lat"],
        lng=data["lng"],
        description=data.get("description"),
        approved=False
    )

    db.add(m)
    db.commit()
    db.close()
    return {"success": True}


@app.get("/admin/api/microwaves")
def admin_pending_microwaves():
    if not session.get("is_admin"):
        return {"error": "Unauthorized"}, 403

    db = SessionLocal()
    rows = (
        db.query(Microwave, Building.name)
        .join(Building)
        .filter(Microwave.approved == False)
        .all()
    )

    return jsonify([
        {
            "id": m.id,
            "building": building_name,
            "lat": m.lat,
            "lng": m.lng,
            "description": m.description,
            "created_at": m.created_at.isoformat()
        }
        for m, building_name in rows
    ])
    
@app.get("/microwaves/pending")
def get_pending_microwaves():
    db = SessionLocal()
    rows = (
        db.query(Microwave, Building.name.label("building_name"))
        .join(Building, Microwave.building_id == Building.id)
        .filter(Microwave.approved == False)
        .all()
    )

    return jsonify([
        {
            "id": m.Microwave.id,
            "lat": m.Microwave.lat,
            "lng": m.Microwave.lng,
            "description": m.Microwave.description,
            "building": m.building_name,
            "created_at": m.Microwave.created_at.isoformat()
        }
        for m in rows
    ])

@app.post("/admin/api/microwaves/<int:id>/approve")
def approve_microwave(id):
    if not session.get("is_admin"):
        return {"error": "Unauthorized"}, 403

    db = SessionLocal()
    m = db.query(Microwave).get(id)
    if not m:
        return {"error": "Not found"}, 404

    m.approved = True
    db.commit()
    db.close()
    return {"success": True}

@app.delete("/admin/api/microwaves/<int:id>")
def reject_microwave(id):
    if not session.get("is_admin"):
        return {"error": "Unauthorized"}, 403

    db = SessionLocal()
    m = db.query(Microwave).get(id)
    if not m:
        return {"error": "Not found"}, 404

    db.delete(m)
    db.commit()
    db.close()
    return {"success": True}



@app.get("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)
