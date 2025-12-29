import os 
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Building

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL.replace("postgres://", "postgresql://"),
    pool_pre_ping=True
)


SessionLocal = sessionmaker(bind=engine)

def init_db():
    Base.metadata.create_all(engine)

init_db()

def seed_buildings():
    
    with SessionLocal.begin() as session:
        
        if(session.query(Building).first()):
            return

        buildings = [
            Building(name="Centennial Centre for Interdisciplinary Science", floors=5,
                    lat=53.52835189740243, lng=-113.52554298362608),

            Building(name="Engineering Teaching and Learning Complex", floors=6,
                    lat=53.52731951276087, lng=-113.52866898362612),

            Building(name="Natural Resources Engineering Facility", floors=5,
                    lat=53.52658036179195, lng=-113.52974350385519),

            Building(name="Donadeo Innovation Centre for Engineering", floors=12,
                    lat=53.52829542268496, lng=-113.52966233505758),

            Building(name="Van Vliet Centre", floors=2,
                    lat=53.52439609023649, lng=-113.52748897569323),

            Building(name="Edmonton Clinic Health Academy", floors=5,
                    lat=53.52172069274078, lng=-113.52657566034894),

            Building(name="Students' Union Building", floors=6,
                    lat=53.525464698663164, lng=-113.52745542490354),

            Building(name="Agriculture/Forestry Centre", floors=3,
                    lat=53.52628387326466, lng=-113.52802660452927),

            Building(name="South Academic Building", floors=4,
                    lat=53.525894825739705, lng=-113.52573063359874),

            Building(name="Central Academic Building", floors=5,
                    lat=53.526654764396454, lng=-113.52435780304856),

            Building(name="Henry Marshall Tory Building", floors=4,
                    lat=53.52809134988393, lng=-113.52196280267628),

            Building(name="School of Business", floors=4,
                    lat=53.52744215918049, lng=-113.52186624185809),

            Building(name="HUB", floors=1,
                    lat=53.526481869218806, lng=-113.52022777732554),

            Building(name="Humanities Centre", floors=4,
                    lat=53.52733749131571, lng=-113.51967746034867),

            Building(name="Education Building", floors=4,
                    lat=53.52312395258176, lng=-113.5228448970726),

            Building(name="University Commons", floors=5,
                    lat=53.52565515374066, lng=-113.5234097738403),
        ]

        session.add_all(buildings)
        session.commit()
        session.close()

if __name__ == "__main__":
    init_db()
    seed_buildings()