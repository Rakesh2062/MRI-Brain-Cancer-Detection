// Singleton Mock DB interface
export const getPatients = () => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('vaidyanetra_patients');
  return data ? JSON.parse(data) : [];
};

export const getPatient = (id) => {
  const patients = getPatients();
  return patients.find(p => p.id === id) || null;
};

export const savePatient = (patient) => {
  if (typeof window === 'undefined') return;
  const patients = getPatients();
  const index = patients.findIndex(p => p.id === patient.id);
  
  if (index >= 0) {
    patients[index] = patient;
  } else {
    patients.push(patient);
  }
  
  localStorage.setItem('vaidyanetra_patients', JSON.stringify(patients));
};

export const generatePatientId = () => {
  const hash = Math.floor(1000 + Math.random() * 9000);
  return `VN-2026-${hash}`;
};
