from sqlalchemy import Column, Integer, String, Date, DateTime, Numeric, Boolean, ForeignKey, Text, Table, ForeignKeyConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# ==========================================
# 1. Lookup Masters & Geo Tables
# ==========================================

class State(Base):
    __tablename__ = 'State'
    StateID = Column(Integer, primary_key=True)
    StateName = Column(String(100), nullable=False)
    NationalityID = Column(Integer, nullable=True)
    Active = Column(Boolean, default=True)

    districts = relationship("District", back_populates="state")
    units = relationship("Unit", back_populates="state")
    courts = relationship("Court", back_populates="state")

class District(Base):
    __tablename__ = 'District'
    DistrictID = Column(Integer, primary_key=True)
    DistrictName = Column(String(100), nullable=False)
    StateID = Column(Integer, ForeignKey('State.StateID'), nullable=False)
    Active = Column(Boolean, default=True)

    state = relationship("State", back_populates="districts")
    units = relationship("Unit", back_populates="district")
    employees = relationship("Employee", back_populates="district")
    courts = relationship("Court", back_populates="district")

class UnitType(Base):
    __tablename__ = 'UnitType'
    UnitTypeID = Column(Integer, primary_key=True)
    UnitTypeName = Column(String(100), nullable=False)
    CityDistState = Column(String(50), nullable=True)
    Hierarchy = Column(Integer, nullable=True)
    Active = Column(Boolean, default=True)

    units = relationship("Unit", back_populates="unit_type")

class Unit(Base):
    __tablename__ = 'Unit'
    UnitID = Column(Integer, primary_key=True)
    UnitName = Column(String(200), nullable=False)
    TypeID = Column(Integer, ForeignKey('UnitType.UnitTypeID'), nullable=False)
    ParentUnit = Column(Integer, ForeignKey('Unit.UnitID'), nullable=True)
    NationalityID = Column(Integer, nullable=True)
    StateID = Column(Integer, ForeignKey('State.StateID'), nullable=False)
    DistrictID = Column(Integer, ForeignKey('District.DistrictID'), nullable=False)
    Active = Column(Boolean, default=True)

    unit_type = relationship("UnitType", back_populates="units")
    state = relationship("State", back_populates="units")
    district = relationship("District", back_populates="units")
    
    employees = relationship("Employee", back_populates="unit")
    cases = relationship("CaseMaster", back_populates="police_station")

class Rank(Base):
    __tablename__ = 'Rank'
    RankID = Column(Integer, primary_key=True)
    RankName = Column(String(100), nullable=False)
    Hierarchy = Column(Integer, nullable=True)
    Active = Column(Boolean, default=True)

    employees = relationship("Employee", back_populates="rank")

class Designation(Base):
    __tablename__ = 'Designation'
    DesignationID = Column(Integer, primary_key=True)
    DesignationName = Column(String(150), nullable=False)
    Active = Column(Boolean, default=True)
    SortOrder = Column(Integer, nullable=True)

    employees = relationship("Employee", back_populates="designation")

class Employee(Base):
    __tablename__ = 'Employee'
    EmployeeID = Column(Integer, primary_key=True)
    DistrictID = Column(Integer, ForeignKey('District.DistrictID'), nullable=False)
    UnitID = Column(Integer, ForeignKey('Unit.UnitID'), nullable=False)
    RankID = Column(Integer, ForeignKey('Rank.RankID'), nullable=False)
    DesignationID = Column(Integer, ForeignKey('Designation.DesignationID'), nullable=False)
    KGID = Column(String(50), unique=True, nullable=False) # Karnataka Gov ID
    FirstName = Column(String(100), nullable=False)
    EmployeeDOB = Column(Date, nullable=True)
    GenderID = Column(Integer, nullable=True)
    BloodGroupID = Column(Integer, nullable=True)
    PhysicallyChallenged = Column(Boolean, default=False)
    AppointmentDate = Column(Date, nullable=True)

    district = relationship("District", back_populates="employees")
    unit = relationship("Unit", back_populates="employees")
    rank = relationship("Rank", back_populates="employees")
    designation = relationship("Designation", back_populates="employees")
    
    registered_cases = relationship("CaseMaster", back_populates="registering_officer")
    chargesheets = relationship("ChargesheetDetails", back_populates="chargesheet_officer")

# ==========================================
# 2. Case & Offence Lookup Tables
# ==========================================

class CaseCategory(Base):
    __tablename__ = 'CaseCategory'
    CaseCategoryID = Column(Integer, primary_key=True)
    LookupValue = Column(String(50), nullable=False) # FIR, UDR, PAR...

    cases = relationship("CaseMaster", back_populates="case_category")

class GravityOffence(Base):
    __tablename__ = 'GravityOffence'
    GravityOffenceID = Column(Integer, primary_key=True)
    LookupValue = Column(String(50), nullable=False) # Heinous, Non-Heinous

    cases = relationship("CaseMaster", back_populates="gravity_offence")

class CaseStatusMaster(Base):
    __tablename__ = 'CaseStatusMaster'
    CaseStatusID = Column(Integer, primary_key=True)
    CaseStatusName = Column(String(100), nullable=False) # Under Investigation, Chargesheeted, Closed

    cases = relationship("CaseMaster", back_populates="case_status")

class CrimeHead(Base):
    __tablename__ = 'CrimeHead'
    CrimeHeadID = Column(Integer, primary_key=True)
    CrimeGroupName = Column(String(150), nullable=False)
    Active = Column(Boolean, default=True)

    subheads = relationship("CrimeSubHead", back_populates="crime_head")
    cases = relationship("CaseMaster", back_populates="crime_major_head")

class CrimeSubHead(Base):
    __tablename__ = 'CrimeSubHead'
    CrimeSubHeadID = Column(Integer, primary_key=True)
    CrimeHeadID = Column(Integer, ForeignKey('CrimeHead.CrimeHeadID'), nullable=False)
    CrimeHeadName = Column(String(150), nullable=False) # Sub-head name (e.g. Murder, Theft)
    SeqID = Column(Integer, nullable=True)

    crime_head = relationship("CrimeHead", back_populates="subheads")
    cases = relationship("CaseMaster", back_populates="crime_minor_head")

class Court(Base):
    __tablename__ = 'Court'
    CourtID = Column(Integer, primary_key=True)
    CourtName = Column(String(200), nullable=False)
    DistrictID = Column(Integer, ForeignKey('District.DistrictID'), nullable=False)
    StateID = Column(Integer, ForeignKey('State.StateID'), nullable=False)
    Active = Column(Boolean, default=True)

    state = relationship("State", back_populates="courts")
    district = relationship("District", back_populates="courts")
    cases = relationship("CaseMaster", back_populates="court")

# ==========================================
# 3. Main Case (FIR) Core Model
# ==========================================

class CaseMaster(Base):
    __tablename__ = 'CaseMaster'
    CaseMasterID = Column(Integer, primary_key=True)
    CrimeNo = Column(String(50), nullable=False, unique=True)
    CaseNo = Column(String(20), nullable=False)
    CrimeRegisteredDate = Column(Date, nullable=False)
    PolicePersonID = Column(Integer, ForeignKey('Employee.EmployeeID'), nullable=False)
    PoliceStationID = Column(Integer, ForeignKey('Unit.UnitID'), nullable=False)
    CaseCategoryID = Column(Integer, ForeignKey('CaseCategory.CaseCategoryID'), nullable=False)
    GravityOffenceID = Column(Integer, ForeignKey('GravityOffence.GravityOffenceID'), nullable=False)
    CrimeMajorHeadID = Column(Integer, ForeignKey('CrimeHead.CrimeHeadID'), nullable=False)
    CrimeMinorHeadID = Column(Integer, ForeignKey('CrimeSubHead.CrimeSubHeadID'), nullable=False)
    CaseStatusID = Column(Integer, ForeignKey('CaseStatusMaster.CaseStatusID'), nullable=False)
    CourtID = Column(Integer, ForeignKey('Court.CourtID'), nullable=False)
    IncidentFromDate = Column(DateTime, nullable=True)
    IncidentToDate = Column(DateTime, nullable=True)
    InfoReceivedPSDate = Column(DateTime, nullable=True)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    BriefFacts = Column(Text, nullable=True)

    registering_officer = relationship("Employee", back_populates="registered_cases")
    police_station = relationship("Unit", back_populates="cases")
    case_category = relationship("CaseCategory", back_populates="cases")
    gravity_offence = relationship("GravityOffence", back_populates="cases")
    crime_major_head = relationship("CrimeHead", back_populates="cases")
    crime_minor_head = relationship("CrimeSubHead", back_populates="cases")
    case_status = relationship("CaseStatusMaster", back_populates="cases")
    court = relationship("Court", back_populates="cases")

    complainants = relationship("ComplainantDetails", back_populates="case_record")
    act_sections = relationship("ActSectionAssociation", back_populates="case_record")
    victims = relationship("Victim", back_populates="case_record")
    accused_list = relationship("Accused", back_populates="case_record")
    chargesheet = relationship("ChargesheetDetails", uselist=False, back_populates="case_record")
    arrests = relationship("ArrestSurrender", back_populates="case_record")

# ==========================================
# 4. Complainant, Accused, & Victim Details
# ==========================================

class CasteMaster(Base):
    __tablename__ = 'CasteMaster'
    caste_master_id = Column(Integer, primary_key=True)
    caste_master_name = Column(String(100), nullable=False)

    complainants = relationship("ComplainantDetails", back_populates="caste")

class ReligionMaster(Base):
    __tablename__ = 'ReligionMaster'
    ReligionID = Column(Integer, primary_key=True)
    ReligionName = Column(String(100), nullable=False)

    complainants = relationship("ComplainantDetails", back_populates="religion")

class OccupationMaster(Base):
    __tablename__ = 'OccupationMaster'
    OccupationID = Column(Integer, primary_key=True)
    OccupationName = Column(String(150), nullable=False)

    complainants = relationship("ComplainantDetails", back_populates="occupation")

class ComplainantDetails(Base):
    __tablename__ = 'ComplainantDetails'
    ComplainantID = Column(Integer, primary_key=True)
    CaseMasterID = Column(Integer, ForeignKey('CaseMaster.CaseMasterID'), nullable=False)
    ComplainantName = Column(String(200), nullable=False)
    AgeYear = Column(Integer, nullable=True)
    OccupationID = Column(Integer, ForeignKey('OccupationMaster.OccupationID'), nullable=True)
    ReligionID = Column(Integer, ForeignKey('ReligionMaster.ReligionID'), nullable=True)
    CasteID = Column(Integer, ForeignKey('CasteMaster.caste_master_id'), nullable=True)
    GenderID = Column(Integer, nullable=True) # lookup value e.g. 1=M, 2=F, 3=T

    case_record = relationship("CaseMaster", back_populates="complainants")
    occupation = relationship("OccupationMaster", back_populates="complainants")
    religion = relationship("ReligionMaster", back_populates="complainants")
    caste = relationship("CasteMaster", back_populates="complainants")

class Victim(Base):
    __tablename__ = 'Victim'
    VictimMasterID = Column(Integer, primary_key=True)
    CaseMasterID = Column(Integer, ForeignKey('CaseMaster.CaseMasterID'), nullable=False)
    VictimName = Column(String(200), nullable=False)
    AgeYear = Column(Integer, nullable=True)
    GenderID = Column(Integer, nullable=True)
    VictimPolice = Column(String(5), default="0") # '1' if police, else '0'

    case_record = relationship("CaseMaster", back_populates="victims")

class Accused(Base):
    __tablename__ = 'Accused'
    AccusedMasterID = Column(Integer, primary_key=True)
    CaseMasterID = Column(Integer, ForeignKey('CaseMaster.CaseMasterID'), nullable=False)
    AccusedName = Column(String(200), nullable=False)
    AgeYear = Column(Integer, nullable=True)
    GenderID = Column(Integer, nullable=True)
    PersonID = Column(String(10), nullable=True) # Sorting like A1, A2, A3...

    case_record = relationship("CaseMaster", back_populates="accused_list")
    arrests = relationship("ArrestSurrender", back_populates="accused")
    junction_arrests = relationship("inv_arrestsurrenderaccused", back_populates="accused")

# ==========================================
# 5. Law & Sections Tables
# ==========================================

class Act(Base):
    __tablename__ = 'Act'
    ActCode = Column(String(50), primary_key=True)
    ActDescription = Column(String(250), nullable=False)
    ShortName = Column(String(100), nullable=True)
    Active = Column(Boolean, default=True)

    sections = relationship("Section", back_populates="act")

class Section(Base):
    __tablename__ = 'Section'
    ActCode = Column(String(50), ForeignKey('Act.ActCode'), primary_key=True)
    SectionCode = Column(String(50), primary_key=True)
    SectionDescription = Column(String(500), nullable=True)
    Active = Column(Boolean, default=True)

    act = relationship("Act", back_populates="sections")

class ActSectionAssociation(Base):
    __tablename__ = 'ActSectionAssociation'
    CaseMasterID = Column(Integer, ForeignKey('CaseMaster.CaseMasterID'), primary_key=True)
    ActID = Column(String(50), primary_key=True)
    SectionID = Column(String(50), primary_key=True)
    ActOrderID = Column(Integer, nullable=True)
    SectionOrderID = Column(Integer, nullable=True)

    case_record = relationship("CaseMaster", back_populates="act_sections")

    __table_args__ = (
        ForeignKeyConstraint(
            ['ActID', 'SectionID'],
            ['Section.ActCode', 'Section.SectionCode']
        ),
    )

class CrimeHeadActSection(Base):
    __tablename__ = 'CrimeHeadActSection'
    CrimeHeadID = Column(Integer, ForeignKey('CrimeHead.CrimeHeadID'), primary_key=True)
    ActCode = Column(String(50), ForeignKey('Act.ActCode'), primary_key=True)
    SectionCode = Column(String(50), primary_key=True)

    __table_args__ = (
        ForeignKeyConstraint(
            ['ActCode', 'SectionCode'],
            ['Section.ActCode', 'Section.SectionCode']
        ),
    )

# ==========================================
# 6. Arrest & Chargesheet Details
# ==========================================

class ArrestSurrender(Base):
    __tablename__ = 'ArrestSurrender'
    ArrestSurrenderID = Column(Integer, primary_key=True)
    CaseMasterID = Column(Integer, ForeignKey('CaseMaster.CaseMasterID'), nullable=False)
    ArrestSurrenderTypeID = Column(Integer, nullable=True)
    ArrestSurrenderDate = Column(Date, nullable=False)
    ArrestSurrenderStateId = Column(Integer, ForeignKey('State.StateID'), nullable=True)
    ArrestSurrenderDistrictId = Column(Integer, ForeignKey('District.DistrictID'), nullable=True)
    PoliceStationID = Column(Integer, ForeignKey('Unit.UnitID'), nullable=True)
    IOID = Column(Integer, ForeignKey('Employee.EmployeeID'), nullable=True)
    CourtID = Column(Integer, ForeignKey('Court.CourtID'), nullable=True)
    AccusedMasterID = Column(Integer, ForeignKey('Accused.AccusedMasterID'), nullable=True)
    IsAccused = Column(Boolean, default=True)
    IsComplainantAccused = Column(Boolean, default=False)

    case_record = relationship("CaseMaster", back_populates="arrests")
    accused = relationship("Accused", back_populates="arrests")
    junction_accused = relationship("inv_arrestsurrenderaccused", back_populates="arrest")

class inv_arrestsurrenderaccused(Base):
    __tablename__ = 'inv_arrestsurrenderaccused'
    ArrestSurrenderID = Column(Integer, ForeignKey('ArrestSurrender.ArrestSurrenderID'), primary_key=True)
    AccusedMasterID = Column(Integer, ForeignKey('Accused.AccusedMasterID'), primary_key=True)

    arrest = relationship("ArrestSurrender", back_populates="junction_accused")
    accused = relationship("Accused", back_populates="junction_arrests")

class ChargesheetDetails(Base):
    __tablename__ = 'ChargesheetDetails'
    CSID = Column(Integer, primary_key=True)
    CaseMasterID = Column(Integer, ForeignKey('CaseMaster.CaseMasterID'), nullable=False, unique=True)
    csdate = Column(DateTime, nullable=False)
    cstype = Column(String(5), nullable=True) # A=Chargesheet, B=False, C=Undetected
    PolicePersonID = Column(Integer, ForeignKey('Employee.EmployeeID'), nullable=False)

    case_record = relationship("CaseMaster", back_populates="chargesheet")
    chargesheet_officer = relationship("Employee", back_populates="chargesheets")

# ==========================================
# 7. System & Audit Tables
# ==========================================

class AuditLog(Base):
    __tablename__ = 'AuditLog'
    AuditLogID = Column(Integer, primary_key=True)
    Username = Column(String(100), nullable=False)
    Role = Column(String(50), nullable=False)
    Action = Column(String(100), nullable=False) # e.g. LOGIN, SQL_QUERY, DOWNLOAD_PDF
    Details = Column(Text, nullable=True)
    Timestamp = Column(DateTime, default=func.now())
    IPAddress = Column(String(50), nullable=True)

class ConversationSession(Base):
    __tablename__ = 'ConversationSession'
    SessionID = Column(String(100), primary_key=True)
    Username = Column(String(100), nullable=False)
    Title = Column(String(200), nullable=False)
    CreatedAt = Column(DateTime, default=func.now())
    UpdatedAt = Column(DateTime, default=func.now(), onupdate=func.now())

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = 'ChatMessage'
    MessageID = Column(Integer, primary_key=True)
    SessionID = Column(String(100), ForeignKey('ConversationSession.SessionID'), nullable=False)
    Sender = Column(String(50), nullable=False) # 'user' or 'assistant'
    Content = Column(Text, nullable=False)
    Timestamp = Column(DateTime, default=func.now())
    Evidence = Column(Text, nullable=True) # Stored JSON representing SQL/Cypher logs, database records

    session = relationship("ConversationSession", back_populates="messages")

class DocumentKnowledge(Base):
    __tablename__ = 'DocumentKnowledge'
    DocID = Column(Integer, primary_key=True)
    Filename = Column(String(250), nullable=False)
    Category = Column(String(50), nullable=False) # BNS, IPC, SOP, MANUAL
    Content = Column(Text, nullable=False)
    ChunkIndex = Column(Integer, nullable=False)
    EmbeddingID = Column(String(100), nullable=False) # Maps to Qdrant vector ID
    CreatedAt = Column(DateTime, default=func.now())
