from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()


class Building(Base):
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    floors = Column(Integer)
    lat = Column(Float)
    lng = Column(Float)

    microwaves = relationship("Microwave", back_populates="building")


class Microwave(Base):
    __tablename__ = "microwaves"

    id = Column(Integer, primary_key=True)
    building_id = Column(Integer, ForeignKey("buildings.id"))
    floor = Column(Integer)
    lat = Column(Float)
    lng = Column(Float)
    description = Column(String)

    building = relationship("Building", back_populates="microwaves")
    reports = relationship("Report", back_populates="microwave")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True)
    report_date = Column(DateTime, default=datetime.utcnow)
    microwave_id = Column(Integer, ForeignKey("microwaves.id"))

    microwave = relationship("Microwave", back_populates="reports")
