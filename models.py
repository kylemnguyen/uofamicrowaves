from sqlalchemy import Column, Integer, Float, String, Boolean
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Microwave(Base):
    __tablename__ = "microwaves"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    broken = Column(Boolean, default=False)
