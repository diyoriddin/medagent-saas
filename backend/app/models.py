import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Float, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .db import Base


class Clinic(Base):
    __tablename__ = "clinic"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "app_user"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    clinic_id = Column(String, ForeignKey("clinic.id"), nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, nullable=False, default="RECEPTIONIST")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    clinic = relationship("Clinic")


class Doctor(Base):
    __tablename__ = "doctor"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    clinic_id = Column(String, ForeignKey("clinic.id"), nullable=False)
    full_name = Column(String, nullable=False)
    specialty = Column(String, nullable=False)
    price = Column(Float, default=0.0)
    duration_min = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Appointment(Base):
    __tablename__ = "appointment"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    clinic_id = Column(String, ForeignKey("clinic.id"), nullable=False)
    doctor_id = Column(String, ForeignKey("doctor.id"), nullable=False)
    patient_id = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(String, nullable=False, default="CONFIRMED")
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    clinic = relationship("Clinic")
    doctor = relationship("Doctor")
