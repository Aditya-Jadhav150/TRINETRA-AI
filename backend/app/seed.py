import logging
import random
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal, neo4j_driver, qdrant_client
from app import models
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fallback embedding generator (384 dimensions) in case sentence-transformers takes too long to load
class FallbackEmbedder:
    def encode(self, text: str):
        # Deterministic vector generation based on character codes in string
        np.random.seed(sum(ord(c) for c in text) % 2**32)
        vec = np.random.randn(384)
        norm = np.linalg.norm(vec)
        return (vec / norm).tolist() if norm > 0 else vec.tolist()

try:
    from sentence_transformers import SentenceTransformer
    embedder = SentenceTransformer('all-MiniLM-L6-v2')
    logger.info("SentenceTransformer loaded successfully.")
except Exception as e:
    logger.warning(f"Could not load SentenceTransformer, using fallback embedder: {e}")
    embedder = FallbackEmbedder()

# ==========================================
# SEED DATA GENERATOR
# ==========================================

def seed_database():
    # 1. Create tables in PostgreSQL
    logger.info("Creating tables in PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if database is already seeded
        if db.query(models.State).first():
            logger.info("Database already seeded. Skipping seeder.")
            return
            
        logger.info("Seeding Masters and Lookups...")
        
        # State
        karnataka = models.State(StateID=1, StateName="Karnataka", NationalityID=1, Active=True)
        db.add(karnataka)
        db.commit()

        # Districts
        districts = [
            models.District(DistrictID=1, DistrictName="Bangalore City", StateID=1, Active=True),
            models.District(DistrictID=2, DistrictName="Mysore City", StateID=1, Active=True),
            models.District(DistrictID=3, DistrictName="Mangalore City", StateID=1, Active=True),
            models.District(DistrictID=4, DistrictName="Hubballi-Dharwad", StateID=1, Active=True),
            models.District(DistrictID=5, DistrictName="Belagavi", StateID=1, Active=True)
        ]
        db.add_all(districts)
        db.commit()

        # Unit Types
        types = [
            models.UnitType(UnitTypeID=1, UnitTypeName="Police Station", CityDistState="City", Hierarchy=1),
            models.UnitType(UnitTypeID=2, UnitTypeName="Circle Office", CityDistState="District", Hierarchy=2),
            models.UnitType(UnitTypeID=3, UnitTypeName="Commissioner Office", CityDistState="State", Hierarchy=3)
        ]
        db.add_all(types)
        db.commit()

        # Units (Police Stations)
        stations = [
            models.Unit(UnitID=1, UnitName="Cubbon Park PS", TypeID=1, StateID=1, DistrictID=1),
            models.Unit(UnitID=2, UnitName="Indiranagar PS", TypeID=1, StateID=1, DistrictID=1),
            models.Unit(UnitID=3, UnitName="Koramangala PS", TypeID=1, StateID=1, DistrictID=1),
            models.Unit(UnitID=4, UnitName="Vidyaranyapuram PS", TypeID=1, StateID=1, DistrictID=2),
            models.Unit(UnitID=5, UnitName="Ashokapuram PS", TypeID=1, StateID=1, DistrictID=2),
            models.Unit(UnitID=6, UnitName="Kadri PS", TypeID=1, StateID=1, DistrictID=3),
            models.Unit(UnitID=7, UnitName="Hubli Town PS", TypeID=1, StateID=1, DistrictID=4),
            models.Unit(UnitID=8, UnitName="Belgaum Market PS", TypeID=1, StateID=1, DistrictID=5)
        ]
        db.add_all(stations)
        db.commit()

        # Ranks
        ranks = [
            models.Rank(RankID=1, RankName="DGP", Hierarchy=1),
            models.Rank(RankID=2, RankName="Commissioner", Hierarchy=2),
            models.Rank(RankID=3, RankName="Superintendent of Police", Hierarchy=3),
            models.Rank(RankID=4, RankName="Inspector of Police", Hierarchy=4),
            models.Rank(RankID=5, RankName="Sub-Inspector of Police", Hierarchy=5),
            models.Rank(RankID=6, RankName="Head Constable", Hierarchy=6),
            models.Rank(RankID=7, RankName="Constable", Hierarchy=7)
        ]
        db.add_all(ranks)
        db.commit()

        # Designations
        designations = [
            models.Designation(DesignationID=1, DesignationName="Station House Officer (SHO)", SortOrder=1),
            models.Designation(DesignationID=2, DesignationName="Investigating Officer (IO)", SortOrder=2),
            models.Designation(DesignationID=3, DesignationName="Duty Officer", SortOrder=3),
            models.Designation(DesignationID=4, DesignationName="Beat Officer", SortOrder=4)
        ]
        db.add_all(designations)
        db.commit()

        # Employees (Officers)
        officers = [
            models.Employee(EmployeeID=1, DistrictID=1, UnitID=1, RankID=4, DesignationID=1, KGID="KGP0001", FirstName="Ramesh Kumar", EmployeeDOB=date(1980, 5, 12), GenderID=1, AppointmentDate=date(2005, 8, 1)),
            models.Employee(EmployeeID=2, DistrictID=1, UnitID=1, RankID=5, DesignationID=2, KGID="KGP0002", FirstName="Anil Gowda", EmployeeDOB=date(1988, 11, 23), GenderID=1, AppointmentDate=date(2012, 6, 15)),
            models.Employee(EmployeeID=3, DistrictID=1, UnitID=2, RankID=4, DesignationID=1, KGID="KGP0003", FirstName="Siddaramaiah NK", EmployeeDOB=date(1982, 3, 4), GenderID=1, AppointmentDate=date(2007, 2, 10)),
            models.Employee(EmployeeID=4, DistrictID=2, UnitID=4, RankID=4, DesignationID=1, KGID="KGP0004", FirstName="Shiva Murthy", EmployeeDOB=date(1977, 9, 30), GenderID=1, AppointmentDate=date(2002, 10, 1)),
            models.Employee(EmployeeID=5, DistrictID=3, UnitID=6, RankID=4, DesignationID=1, KGID="KGP0005", FirstName="Sandeep Shenoy", EmployeeDOB=date(1984, 1, 15), GenderID=1, AppointmentDate=date(2009, 4, 20)),
            models.Employee(EmployeeID=6, DistrictID=4, UnitID=7, RankID=4, DesignationID=1, KGID="KGP0006", FirstName="Vikram Patil", EmployeeDOB=date(1981, 7, 7), GenderID=1, AppointmentDate=date(2006, 12, 1))
        ]
        db.add_all(officers)
        db.commit()

        # Case Category
        categories = [
            models.CaseCategory(CaseCategoryID=1, LookupValue="FIR"),
            models.CaseCategory(CaseCategoryID=2, LookupValue="UDR"),
            models.CaseCategory(CaseCategoryID=3, LookupValue="PAR"),
            models.CaseCategory(CaseCategoryID=4, LookupValue="Zero FIR")
        ]
        db.add_all(categories)
        db.commit()

        # Gravity Offence
        gravity = [
            models.GravityOffence(GravityOffenceID=1, LookupValue="Heinous"),
            models.GravityOffence(GravityOffenceID=2, LookupValue="Non-Heinous")
        ]
        db.add_all(gravity)
        db.commit()

        # Case Status Master
        status_list = [
            models.CaseStatusMaster(CaseStatusID=1, CaseStatusName="Under Investigation"),
            models.CaseStatusMaster(CaseStatusID=2, CaseStatusName="Chargesheeted"),
            models.CaseStatusMaster(CaseStatusID=3, CaseStatusName="Closed (Detected)"),
            models.CaseStatusMaster(CaseStatusID=4, CaseStatusName="Closed (Untraced)"),
            models.CaseStatusMaster(CaseStatusID=5, CaseStatusName="Closed (False Case)")
        ]
        db.add_all(status_list)
        db.commit()

        # Caste Master
        castes = [
            models.CasteMaster(caste_master_id=1, caste_master_name="General"),
            models.CasteMaster(caste_master_id=2, caste_master_name="SC"),
            models.CasteMaster(caste_master_id=3, caste_master_name="ST"),
            models.CasteMaster(caste_master_id=4, caste_master_name="OBC")
        ]
        db.add_all(castes)
        db.commit()

        # Religion Master
        religions = [
            models.ReligionMaster(ReligionID=1, ReligionName="Hindu"),
            models.ReligionMaster(ReligionID=2, ReligionName="Muslim"),
            models.ReligionMaster(ReligionID=3, ReligionName="Christian"),
            models.ReligionMaster(ReligionID=4, ReligionName="Sikh"),
            models.ReligionMaster(ReligionID=5, ReligionName="Jain")
        ]
        db.add_all(religions)
        db.commit()

        # Occupation Master
        occupations = [
            models.OccupationMaster(OccupationID=1, OccupationName="Business"),
            models.OccupationMaster(OccupationID=2, OccupationName="Agriculture"),
            models.OccupationMaster(OccupationID=3, OccupationName="Private Employee"),
            models.OccupationMaster(OccupationID=4, OccupationName="Gov Employee"),
            models.OccupationMaster(OccupationID=5, OccupationName="Student"),
            models.OccupationMaster(OccupationID=6, OccupationName="Unemployed")
        ]
        db.add_all(occupations)
        db.commit()

        # Courts
        courts = [
            models.Court(CourtID=1, CourtName="CMM Court, Bangalore", DistrictID=1, StateID=1),
            models.Court(CourtID=2, CourtName="District Court, Mysore", DistrictID=2, StateID=1),
            models.Court(CourtID=3, CourtName="District Court, Mangalore", DistrictID=3, StateID=1),
            models.Court(CourtID=4, CourtName="District Court, Hubli", DistrictID=4, StateID=1),
            models.Court(CourtID=5, CourtName="District Court, Belgaum", DistrictID=5, StateID=1)
        ]
        db.add_all(courts)
        db.commit()

        # Acts
        acts = [
            models.Act(ActCode="IPC", ActDescription="Indian Penal Code 1860", ShortName="IPC"),
            models.Act(ActCode="BNS", ActDescription="Bharatiya Nyaya Sanhita 2023", ShortName="BNS"),
            models.Act(ActCode="NDPS", ActDescription="Narcotic Drugs and Psychotropic Substances Act 1985", ShortName="NDPS"),
            models.Act(ActCode="ARMS", ActDescription="Arms Act 1959", ShortName="Arms Act")
        ]
        db.add_all(acts)
        db.commit()

        # Sections
        sections = [
            models.Section(ActCode="IPC", SectionCode="302", SectionDescription="Punishment for murder"),
            models.Section(ActCode="IPC", SectionCode="307", SectionDescription="Attempt to murder"),
            models.Section(ActCode="IPC", SectionCode="379", SectionDescription="Punishment for theft"),
            models.Section(ActCode="IPC", SectionCode="392", SectionDescription="Punishment for robbery"),
            models.Section(ActCode="IPC", SectionCode="395", SectionDescription="Punishment for dacoity"),
            models.Section(ActCode="IPC", SectionCode="420", SectionDescription="Cheating and dishonestly inducing delivery of property"),
            models.Section(ActCode="BNS", SectionCode="103", SectionDescription="Punishment for murder"),
            models.Section(ActCode="BNS", SectionCode="303", SectionDescription="Punishment for theft"),
            models.Section(ActCode="NDPS", SectionCode="20", SectionDescription="Punishment for contravention in relation to cannabis plant and cannabis"),
            models.Section(ActCode="ARMS", SectionCode="25", SectionDescription="Punishment for certain offences involving arms")
        ]
        db.add_all(sections)
        db.commit()

        # Crime Head (Major)
        crime_heads = [
            models.CrimeHead(CrimeHeadID=1, CrimeGroupName="Crimes Against Body"),
            models.CrimeHead(CrimeHeadID=2, CrimeGroupName="Crimes Against Property"),
            models.CrimeHead(CrimeHeadID=3, CrimeGroupName="Narcotics"),
            models.CrimeHead(CrimeHeadID=4, CrimeGroupName="White Collar & Cyber Crime")
        ]
        db.add_all(crime_heads)
        db.commit()

        # Crime Sub Head (Minor)
        sub_heads = [
            models.CrimeSubHead(CrimeSubHeadID=1, CrimeHeadID=1, CrimeHeadName="Murder"),
            models.CrimeSubHead(CrimeSubHeadID=2, CrimeHeadID=1, CrimeHeadName="Attempt to Murder"),
            models.CrimeSubHead(CrimeSubHeadID=3, CrimeHeadID=2, CrimeHeadName="Theft"),
            models.CrimeSubHead(CrimeSubHeadID=4, CrimeHeadID=2, CrimeHeadName="Robbery"),
            models.CrimeSubHead(CrimeSubHeadID=5, CrimeHeadID=2, CrimeHeadName="Dacoity"),
            models.CrimeSubHead(CrimeSubHeadID=6, CrimeHeadID=3, CrimeHeadName="Drug Trafficking"),
            models.CrimeSubHead(CrimeSubHeadID=7, CrimeHeadID=4, CrimeHeadName="Cheating / Fraud")
        ]
        db.add_all(sub_heads)
        db.commit()

        # CrimeHeadActSection combination
        mapping = [
            models.CrimeHeadActSection(CrimeHeadID=1, ActCode="IPC", SectionCode="302"),
            models.CrimeHeadActSection(CrimeHeadID=1, ActCode="IPC", SectionCode="307"),
            models.CrimeHeadActSection(CrimeHeadID=2, ActCode="IPC", SectionCode="379"),
            models.CrimeHeadActSection(CrimeHeadID=2, ActCode="IPC", SectionCode="392"),
            models.CrimeHeadActSection(CrimeHeadID=2, ActCode="IPC", SectionCode="395")
        ]
        db.add_all(mapping)
        db.commit()

        logger.info("Masters and Lookups seeded.")
        
        # ==========================================
        # CASES (FIRS) GENERATION
        # ==========================================
        logger.info("Generating cases data...")
        
        # Define detailed list of brief facts and properties for 25 cases
        cases_pool = [
            {
                "id": 1, "station_id": 1, "category_id": 1, "gravity_id": 1, "major_id": 1, "minor_id": 1, "status_id": 1, "court_id": 1, "officer_id": 1,
                "crime_no": "100100001202600001", "case_no": "202600001",
                "days_ago": 45, "lat": 12.9764, "lng": 77.5936,
                "facts": "DEMO_SYNTHETIC: The accused Sunil Gowda got into a violent alteraction with victim Rajesh Hegde over a family land dispute at Cubbon Park. A1 Sunil Gowda took out a dagger and stabbed Rajesh Hegde in the chest multiple times. The victim was declared dead on arrival at Bowring Hospital. The crime was committed in broad daylight in front of multiple witnesses.",
                "complainant": "Suresh Hegde", "comp_age": 42, "comp_gender": 1, "comp_occ": 2, "comp_rel": 1, "comp_caste": 1,
                "victim": "Rajesh Hegde", "victim_age": 38, "victim_gender": 1,
                "accused_list": [("Sunil Gowda", 29, 1, "A1")],
                "acts_sections": [("IPC", "302")]
            },
            {
                "id": 2, "station_id": 4, "category_id": 1, "gravity_id": 2, "major_id": 2, "minor_id": 3, "status_id": 2, "court_id": 2, "officer_id": 4,
                "crime_no": "100200004202600002", "case_no": "202600002",
                "days_ago": 30, "lat": 12.3023, "lng": 76.6548,
                "facts": "DEMO_SYNTHETIC: The complainant Mahesh Rao reported that during the night when they were visiting relatives, unknown thieves broke open the rear window of his house in Vidyaranyapuram, Mysore. The culprits looted gold ornaments weighing 140 grams (valued at approx Rs. 8 Lakhs) and cash of Rs. 65,000 from the safe in the master bedroom cupboard.",
                "complainant": "Mahesh Rao", "comp_age": 55, "comp_gender": 1, "comp_occ": 4, "comp_rel": 1, "comp_caste": 1,
                "victim": "Mahesh Rao", "victim_age": 55, "victim_gender": 1,
                "accused_list": [("Unknown", None, None, "A1")],
                "acts_sections": [("IPC", "379")]
            },
            {
                "id": 3, "station_id": 2, "category_id": 1, "gravity_id": 2, "major_id": 2, "minor_id": 4, "status_id": 1, "court_id": 1, "officer_id": 3,
                "crime_no": "100100002202600003", "case_no": "202600003",
                "days_ago": 25, "lat": 12.9719, "lng": 77.6412,
                "facts": "DEMO_SYNTHETIC: The victim, a software engineer named Neha Sen, was walking home from Indiranagar metro station at 10 PM. A suspect on a black motorcycyle stopped beside her, threatened her with a long knife, and snatched her gold chain and leather handbag containing her iPhone and Rs. 5,000 cash. CCTV footage identified the rider as Sunil Gowda, a known history-sheeter.",
                "complainant": "Neha Sen", "comp_age": 27, "comp_gender": 2, "comp_occ": 3, "comp_rel": 3, "comp_caste": 1,
                "victim": "Neha Sen", "victim_age": 27, "victim_gender": 2,
                "accused_list": [("Sunil Gowda", 29, 1, "A1")], # Repeat offender!
                "acts_sections": [("IPC", "392"), ("ARMS", "25")]
            },
            {
                "id": 4, "station_id": 6, "category_id": 1, "gravity_id": 1, "major_id": 3, "minor_id": 6, "status_id": 2, "court_id": 3, "officer_id": 5,
                "crime_no": "100300006202600004", "case_no": "202600004",
                "days_ago": 20, "lat": 12.8912, "lng": 74.8431,
                "facts": "DEMO_SYNTHETIC: Acting on credible intelligence, Kadri PS police team intercepted a suspicious white Swift car at a roadblock. Upon searching the trunk, police found five packets containing a total of 12 kilograms of Ganja (cannabis). The driver, identified as Mohammed Shafi, confessed that he was transporting the contraband from Mangalore to local college dealers.",
                "complainant": "Sandeep Shenoy (Police)", "comp_age": 42, "comp_gender": 1, "comp_occ": 4, "comp_rel": 1, "comp_caste": 1,
                "victim": "State of Karnataka", "victim_age": 0, "victim_gender": 1,
                "accused_list": [("Mohammed Shafi", 34, 1, "A1"), ("Karan Mehta", 26, 1, "A2")],
                "acts_sections": [("NDPS", "20")]
            },
            {
                "id": 5, "station_id": 1, "category_id": 1, "gravity_id": 2, "major_id": 4, "minor_id": 7, "status_id": 1, "court_id": 1, "officer_id": 2,
                "crime_no": "100100001202600005", "case_no": "202600005",
                "days_ago": 15, "lat": 12.9794, "lng": 77.5906,
                "facts": "DEMO_SYNTHETIC: The complainant Priyesh Shah reported receiving a call from a person claiming to be a customer service agent from SBI. The caller told Priyesh that his credit card would be blocked unless he verified his details. Priyesh shared his bank login details and OTP, following which Rs. 3,50,000 was debited from his account and transferred to different UPI accounts belonging to accused Vinay Lal.",
                "complainant": "Priyesh Shah", "comp_age": 35, "comp_gender": 1, "comp_occ": 1, "comp_rel": 1, "comp_caste": 1,
                "victim": "Priyesh Shah", "victim_age": 35, "victim_gender": 1,
                "accused_list": [("Vinay Lal", 31, 1, "A1")],
                "acts_sections": [("IPC", "420")]
            },
            {
                "id": 6, "station_id": 3, "category_id": 1, "gravity_id": 1, "major_id": 1, "minor_id": 1, "status_id": 1, "court_id": 1, "officer_id": 2,
                "crime_no": "100100003202600006", "case_no": "202600006",
                "days_ago": 12, "lat": 12.9352, "lng": 77.6244,
                "facts": "DEMO_SYNTHETIC: Police responded to a call regarding a body floating in the Koramangala canal. The deceased was identified as 22-year-old college student Divya Reddy. Post-mortem revealed death due to strangulation prior to being dumped. Investigation revealed her boyfriend, Karan Mehta, had murdered her during a jealousy-fueled fight after she tried to end their relationship.",
                "complainant": "Venu Reddy", "comp_age": 50, "comp_gender": 1, "comp_occ": 2, "comp_rel": 1, "comp_caste": 1,
                "victim": "Divya Reddy", "victim_age": 22, "victim_gender": 2,
                "accused_list": [("Karan Mehta", 26, 1, "A1")], # Repeat offender! Appears in drug case 4 and murder case 6!
                "acts_sections": [("IPC", "302")]
            },
            {
                "id": 7, "station_id": 7, "category_id": 1, "gravity_id": 1, "major_id": 1, "minor_id": 2, "status_id": 2, "court_id": 4, "officer_id": 6,
                "crime_no": "100400007202600007", "case_no": "202600007",
                "days_ago": 8, "lat": 15.3647, "lng": 75.1245,
                "facts": "DEMO_SYNTHETIC: The complainant, a local merchant, was attacked by three youths with iron rods near Hubli station over extortion money. The victim sustained critical skull fractures. Witnesses identified the main attacker as local gangster Raju alias 'Kappe' Raju. The victim is in ICU and in critical condition.",
                "complainant": "Basavaraj Pyati", "comp_age": 48, "comp_gender": 1, "comp_occ": 1, "comp_rel": 1, "comp_caste": 4,
                "victim": "Basavaraj Pyati", "victim_age": 48, "victim_gender": 1,
                "accused_list": [("Raju Kappe", 28, 1, "A1"), ("Manjunath G", 25, 1, "A2")],
                "acts_sections": [("IPC", "307")]
            },
            {
                "id": 8, "station_id": 1, "category_id": 1, "gravity_id": 2, "major_id": 2, "minor_id": 3, "status_id": 1, "court_id": 1, "officer_id": 1,
                "crime_no": "100100001202600008", "case_no": "202600008",
                "days_ago": 5, "lat": 12.9754, "lng": 77.5956,
                "facts": "DEMO_SYNTHETIC: The complainant noticed that his high-end Royal Enfield motorcycle, parked outside his apartment complex near Cubbon Park, was missing. Security footage showed a suspect wearing a black helmet using a master key to unlock the ignition and ride away. The suspect matches the physical build and MO of Sunil Gowda.",
                "complainant": "Abhinav Singh", "comp_age": 30, "comp_gender": 1, "comp_occ": 3, "comp_rel": 1, "comp_caste": 1,
                "victim": "Abhinav Singh", "victim_age": 30, "victim_gender": 1,
                "accused_list": [("Sunil Gowda", 29, 1, "A1")], # Repeat offender! Appears in Cases 1, 3, 8
                "acts_sections": [("IPC", "379")]
            },
            {
                "id": 9, "station_id": 5, "category_id": 1, "gravity_id": 2, "major_id": 2, "minor_id": 5, "status_id": 1, "court_id": 2, "officer_id": 4,
                "crime_no": "100200005202600009", "case_no": "202600009",
                "days_ago": 3, "lat": 12.3150, "lng": 76.6410,
                "facts": "DEMO_SYNTHETIC: A group of five armed individuals forced their way into a jewelry shop in Ashokapuram, Mysore at closing time. Brandishing pistols, they assaulted the security guard, broke the glass display counters, and looted gold ornaments weighing approximately 400 grams. The gang escaped in a red getaway car towards the highway.",
                "complainant": "Kishore Kumar", "comp_age": 45, "comp_gender": 1, "comp_occ": 1, "comp_rel": 1, "comp_caste": 1,
                "victim": "Kishore Kumar", "victim_age": 45, "victim_gender": 1,
                "accused_list": [("Vinay Lal", 31, 1, "A1"), ("Raju Kappe", 28, 1, "A2"), ("Unknown", None, None, "A3")], # Gang includes Vinay Lal (cheating in Case 5) and Raju Kappe (extortion/attempted murder in Case 7)!
                "acts_sections": [("IPC", "395"), ("ARMS", "25")]
            }
        ]
        
        # Populate more cases to reach 25 (looping and modifying dates/locations)
        categories_map = [1, 1, 1, 2, 1, 3] # to randomize slightly
        for i in range(10, 26):
            base_case = cases_pool[(i - 10) % len(cases_pool)]
            new_days_ago = base_case["days_ago"] + 10 * (i // 10)
            new_crime_no = f"100{base_case['station_id']}0000{base_case['station_id']}2026{i:05d}"
            new_case_no = f"2026{i:05d}"
            new_lat = float(base_case["lat"]) + random.uniform(-0.05, 0.05)
            new_lng = float(base_case["lng"]) + random.uniform(-0.05, 0.05)
            
            # Simple facts modification to make it unique
            clean_facts = base_case["facts"].replace("DEMO_SYNTHETIC:", f"DEMO_SYNTHETIC (No. {i}):")
            
            cases_pool.append({
                "id": i,
                "station_id": base_case["station_id"],
                "category_id": random.choice([1, 1, 2]),
                "gravity_id": base_case["gravity_id"],
                "major_id": base_case["major_id"],
                "minor_id": base_case["minor_id"],
                "status_id": random.choice([1, 2, 3]),
                "court_id": base_case["court_id"],
                "officer_id": base_case["officer_id"],
                "crime_no": new_crime_no,
                "case_no": new_case_no,
                "days_ago": new_days_ago,
                "lat": new_lat,
                "lng": new_lng,
                "facts": clean_facts,
                "complainant": f"{base_case['complainant']} Jr",
                "comp_age": base_case["comp_age"] + random.randint(-5, 5) if base_case["comp_age"] else 30,
                "comp_gender": base_case["comp_gender"],
                "comp_occ": base_case["comp_occ"],
                "comp_rel": base_case["comp_rel"],
                "comp_caste": base_case["comp_caste"],
                "victim": f"{base_case['victim']} Relative",
                "victim_age": base_case["victim_age"] + random.randint(-5, 5) if base_case["victim_age"] else 35,
                "victim_gender": base_case["victim_gender"],
                "accused_list": base_case["accused_list"],
                "acts_sections": base_case["acts_sections"]
            })
            
        # Write to Postgres
        now_dt = datetime.now()
        for c in cases_pool:
            reg_date = (now_dt - timedelta(days=c["days_ago"])).date()
            inc_from = datetime.combine(reg_date - timedelta(days=1), datetime.min.time()) + timedelta(hours=random.randint(0, 23))
            inc_to = inc_from + timedelta(hours=random.randint(1, 4))
            
            case_record = models.CaseMaster(
                CaseMasterID=c["id"],
                CrimeNo=c["crime_no"],
                CaseNo=c["case_no"],
                CrimeRegisteredDate=reg_date,
                PolicePersonID=c["officer_id"],
                PoliceStationID=c["station_id"],
                CaseCategoryID=c["category_id"],
                GravityOffenceID=c["gravity_id"],
                CrimeMajorHeadID=c["major_id"],
                CrimeMinorHeadID=c["minor_id"],
                CaseStatusID=c["status_id"],
                CourtID=c["court_id"],
                IncidentFromDate=inc_from,
                IncidentToDate=inc_to,
                InfoReceivedPSDate=inc_from + timedelta(hours=2),
                latitude=c["lat"],
                longitude=c["lng"],
                BriefFacts=c["facts"]
            )
            db.add(case_record)
            db.commit()
            
            # Complainant
            comp = models.ComplainantDetails(
                CaseMasterID=c["id"],
                ComplainantName=c["complainant"],
                AgeYear=c["comp_age"],
                GenderID=c["comp_gender"],
                OccupationID=c["comp_occ"],
                ReligionID=c["comp_rel"],
                CasteID=c["comp_caste"]
            )
            db.add(comp)
            
            # Victim
            vic = models.Victim(
                CaseMasterID=c["id"],
                VictimName=c["victim"],
                AgeYear=c["victim_age"],
                GenderID=c["victim_gender"],
                VictimPolice="1" if "Police" in c["complainant"] else "0"
            )
            db.add(vic)
            
            # Accused List
            for name, age, gender, person_id in c["accused_list"]:
                acc = models.Accused(
                    CaseMasterID=c["id"],
                    AccusedName=name,
                    AgeYear=age,
                    GenderID=gender,
                    PersonID=person_id
                )
                db.add(acc)
                db.commit() # needs ID for arrest
                
                # Simple arrest event for some
                if c["status_id"] in [2, 3] and name != "Unknown":
                    arr_date = reg_date + timedelta(days=random.randint(1, 10))
                    arr = models.ArrestSurrender(
                        CaseMasterID=c["id"],
                        ArrestSurrenderDate=arr_date,
                        ArrestSurrenderStateId=1,
                        ArrestSurrenderDistrictId=c["station_id"] % 5 + 1,
                        PoliceStationID=c["station_id"],
                        IOID=c["officer_id"],
                        CourtID=c["court_id"],
                        AccusedMasterID=acc.AccusedMasterID,
                        IsAccused=True
                    )
                    db.add(arr)
                    db.commit()
                    
                    # Junction table entry
                    junc = models.inv_arrestsurrenderaccused(
                        ArrestSurrenderID=arr.ArrestSurrenderID,
                        AccusedMasterID=acc.AccusedMasterID
                    )
                    db.add(junc)
            
            # Acts & Sections Association
            for act_code, section_code in c["acts_sections"]:
                assoc = models.ActSectionAssociation(
                    CaseMasterID=c["id"],
                    ActID=act_code,
                    SectionID=section_code,
                    ActOrderID=1,
                    SectionOrderID=1
                )
                db.add(assoc)
            
            # ChargesheetDetails
            if c["status_id"] == 2:
                cs = models.ChargesheetDetails(
                    CaseMasterID=c["id"],
                    csdate=datetime.combine(reg_date + timedelta(days=15), datetime.min.time()),
                    cstype="A",
                    PolicePersonID=c["officer_id"]
                )
                db.add(cs)
                
            db.commit()
            
        logger.info(f"Successfully seeded {len(cases_pool)} cases in PostgreSQL.")

        # ==========================================
        # 3. NEO4J SYNC (GRAPH DATABASE)
        # ==========================================
        if neo4j_driver:
            logger.info("Syncing relational data to Neo4j graph database...")
            with neo4j_driver.session() as session:
                # Clear existing nodes
                session.run("MATCH (n) DETACH DELETE n")
                
                # Create constraints (Neo4j 5 syntax)
                try:
                    session.run("CREATE CONSTRAINT case_master_id FOR (c:Case) REQUIRE c.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT employee_id FOR (e:Officer) REQUIRE e.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT accused_id FOR (a:Accused) REQUIRE a.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT victim_id FOR (v:Victim) REQUIRE v.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT station_id FOR (s:Station) REQUIRE s.id IS UNIQUE")
                    session.run("CREATE CONSTRAINT section_id FOR (sec:Section) REQUIRE sec.code IS UNIQUE")
                except Exception as ex:
                    logger.warning(f"Neo4j constraints creation failed or already exists: {ex}")

                # Sync Units (Stations)
                db_stations = db.query(models.Unit).all()
                for station in db_stations:
                    session.run(
                        "MERGE (s:Station {id: $id}) ON CREATE SET s.name = $name",
                        id=station.UnitID, name=station.UnitName
                    )

                # Sync Officers
                db_officers = db.query(models.Employee).all()
                for officer in db_officers:
                    session.run(
                        "MERGE (o:Officer {id: $id}) ON CREATE SET o.name = $name, o.kgid = $kgid",
                        id=officer.EmployeeID, name=officer.FirstName, kgid=officer.KGID
                    )

                # Sync Sections
                db_sections = db.query(models.Section).all()
                for sec in db_sections:
                    session.run(
                        "MERGE (sec:Section {code: $code}) ON CREATE SET sec.description = $desc, sec.act = $act",
                        code=sec.SectionCode, desc=sec.SectionDescription, act=sec.ActCode
                    )

                # Sync Cases, Accused, Victims, and relationships
                db_cases = db.query(models.CaseMaster).all()
                for case in db_cases:
                    # Create Case node
                    session.run(
                        "MERGE (c:Case {id: $id}) ON CREATE SET c.number = $number, c.facts = $facts, c.date = $date",
                        id=case.CaseMasterID, number=case.CrimeNo, facts=case.BriefFacts, date=str(case.CrimeRegisteredDate)
                    )

                    # Relationship: Case -> Station (OCCURRED_AT)
                    session.run(
                        "MATCH (c:Case {id: $c_id}), (s:Station {id: $s_id}) MERGE (c)-[:OCCURRED_AT]->(s)",
                        c_id=case.CaseMasterID, s_id=case.PoliceStationID
                    )

                    # Relationship: Officer -> Case (INVESTIGATED_BY)
                    session.run(
                        "MATCH (o:Officer {id: $o_id}), (c:Case {id: $c_id}) MERGE (o)-[:INVESTIGATED_BY]->(c)",
                        o_id=case.PolicePersonID, c_id=case.CaseMasterID
                    )

                    # Sync Case Sections (CHARGED_UNDER)
                    for sec_assoc in case.act_sections:
                        session.run(
                            "MATCH (c:Case {id: $c_id}), (sec:Section {code: $code}) MERGE (c)-[:CHARGED_UNDER]->(sec)",
                            c_id=case.CaseMasterID, code=sec_assoc.SectionID
                        )

                    # Sync Victims (VICTIM_OF)
                    for victim in case.victims:
                        session.run(
                            "MERGE (v:Victim {name: $name})",
                            name=victim.VictimName
                        )
                        session.run(
                            "MATCH (v:Victim {name: $name}), (c:Case {id: $c_id}) MERGE (v)-[:VICTIM_OF]->(c)",
                            name=victim.VictimName, c_id=case.CaseMasterID
                        )

                    # Sync Accused (COMMITTED)
                    for accused in case.accused_list:
                        # Merge accused node by name to identify repeat offenders!
                        session.run(
                            "MERGE (a:Accused {name: $name}) ON CREATE SET a.age = $age",
                            name=accused.AccusedName, age=accused.AgeYear or 0
                        )
                        session.run(
                            "MATCH (a:Accused {name: $name}), (c:Case {id: $c_id}) MERGE (a)-[:COMMITTED]->(c)",
                            name=accused.AccusedName, c_id=case.CaseMasterID
                        )
            logger.info("Successfully synced relational data to Neo4j graph database.")
        else:
            logger.warning("Neo4j driver not connected. Skipped graph sync.")

        # ==========================================
        # 4. QDRANT VECTOR SEEDING
        # ==========================================
        if qdrant_client:
            logger.info("Syncing brief facts embeddings to Qdrant vector database...")
            collection_name = "cases_collection"
            
            # Re-create collection
            try:
                qdrant_client.recreate_collection(
                    collection_name=collection_name,
                    vectors_config={"size": 384, "distance": "Cosine"}
                )
            except Exception as e:
                logger.error(f"Failed to create Qdrant collection: {e}")
                return

            db_cases = db.query(models.CaseMaster).all()
            points = []
            for case in db_cases:
                # Embed the BriefFacts
                text_to_embed = case.BriefFacts or ""
                vector = embedder.encode(text_to_embed)
                
                # Prepare payload
                payload = {
                    "case_id": case.CaseMasterID,
                    "crime_no": case.CrimeNo,
                    "case_no": case.CaseNo,
                    "facts": case.BriefFacts,
                    "registered_date": str(case.CrimeRegisteredDate),
                    "station_id": case.PoliceStationID,
                    "major_head": case.CrimeMajorHeadID,
                    "minor_head": case.CrimeMinorHeadID
                }
                
                points.append({
                    "id": case.CaseMasterID,
                    "vector": vector,
                    "payload": payload
                })
            
            # Upsert into Qdrant in batches
            if points:
                try:
                    qdrant_client.upsert(
                        collection_name=collection_name,
                        points=points
                    )
                    logger.info(f"Successfully upserted {len(points)} embeddings in Qdrant.")
                except Exception as e:
                    logger.error(f"Failed to upsert points in Qdrant: {e}")
        else:
            logger.warning("Qdrant client not connected. Skipped vector seeding.")
            
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
