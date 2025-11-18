from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

from db import SessionLocal, init_db
from models import Microwave


app = Flask(__name__)
CORS(app)

init_db()

@app.get("/microwaves")
def get_microwaves():
    db = SessionLocal()
    items = db.query(Microwave).all()
    return jsonify([{
        "id": m.id,
        "name": m.name,
        "lat": m.lat,
        "lng": m.lng,
        "broken": m.broken
    } for m in items])

@app.post("/microwaves")
def create_microwave():
    data = request.json
    db = SessionLocal()
    m = Microwave(
        name=data["name"],
        lat=data["lat"],
        lng=data["lng"],
        broken=False
    )
    db.add(m)
    db.commit()
    return jsonify({"success": True})

@app.post("/microwaves/<int:id>/broken")
def mark_broken(id):
    db = SessionLocal()
    m = db.query(Microwave).get(id)
    m.broken = True
    db.commit()
    return jsonify({"success": True})

@app.get("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)
