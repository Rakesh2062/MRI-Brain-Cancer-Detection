import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
DATABASE_NAME = os.getenv("DATABASE_NAME", "vaidhyanetra_db")

class DBHandler:
    def __init__(self):
        try:
            self.client = MongoClient(MONGODB_URI)
            self.db = self.client[DATABASE_NAME]
            self.patients_collection = self.db["patients"]
            # Just to verify connection
            self.client.admin.command('ping')
            print("Connected to MongoDB successfully")
        except ConnectionFailure as e:
            print(f"Could not connect to MongoDB: {e}")
            self.client = None

    def create_or_update_patient(self, patient_id: str, record: dict):
        """
        Creates a new patient profile or appends a new MRI scan record to an existing profile.
        """
        if self.client is None:
            print("MongoDB not connected. Skipping DB operation.")
            return False

        try:
            # Check if patient exists
            patient = self.patients_collection.find_one({"patient_id": patient_id})
            
            if patient:
                # Update existing patient by adding the new record
                result = self.patients_collection.update_one(
                    {"patient_id": patient_id},
                    {"$push": {"records": record}}
                )
            else:
                # Create new patient with the record
                new_patient = {
                    "patient_id": patient_id,
                    "name": "", # Can be populated later
                    "age": None,
                    "records": [record]
                }
                result = self.patients_collection.insert_one(new_patient)
            
            return True
        except Exception as e:
            print(f"Database error in create_or_update_patient: {e}")
            return False

    def get_patient(self, patient_id: str):
        """
        Retrieves a single patient's complete history including all scans.
        """
        if self.client is None:
            return None

        try:
            patient_data = self.patients_collection.find_one({"patient_id": patient_id}, {"_id": 0})
            return patient_data
        except Exception as e:
            print(f"Database error in get_patient: {e}")
            return None

    def get_all_patients(self):
        """
        Retrieves all patients in the system.
        """
        if self.client is None:
            return []

        try:
            patients_cursor = self.patients_collection.find({}, {"_id": 0})
            return list(patients_cursor)
        except Exception as e:
            print(f"Database error in get_all_patients: {e}")
            return []

# Singleton instance
db_handler = DBHandler()
