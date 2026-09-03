import { authorizedFetch } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5097/api'

async function extractError(response) {
  try { const body = await response.json(); return body?.message || `Error ${response.status}` } catch { return `Error ${response.status}` }
}

async function publicRequest(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options)
  if (!response.ok) throw new Error(await extractError(response))
  return response.status === 204 ? null : response.json()
}

async function request(path, options = {}) {
  const response = await authorizedFetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } })
  if (!response.ok) throw new Error(await extractError(response))
  return response.status === 204 ? null : response.json()
}

const asJson = (method, body) => ({ method, body: JSON.stringify(body) })

// Public
export const getDoctorsPublic = () => publicRequest('/Doctors')
export const getServicesPublic = () => publicRequest('/services')
export const registerPatient = (data) => publicRequest('/auth/register-patient', asJson('POST', data))

// Patients
export const getPatients = () => request('/Patients')
export const getPatient = (id) => request(`/Patients/${id}`)
export const createPatient = (data) => request('/Patients', asJson('POST', data))
export const updatePatient = (id, data) => request(`/Patients/${id}`, asJson('PUT', data))
export const deletePatient = (id) => request(`/Patients/${id}`, { method: 'DELETE' })

// Doctors
export const getDoctors = () => request('/Doctors')
export const createDoctor = (data) => request('/Doctors', asJson('POST', data))
export const updateDoctor = (id, data) => request(`/Doctors/${id}`, asJson('PUT', data))
export const deleteDoctor = (id) => request(`/Doctors/${id}`, { method: 'DELETE' })

// Appointments
export const getAppointments = () => request('/Appointments')
export const createAppointment = (data) => request('/Appointments', asJson('POST', data))
export const updateAppointment = (id, data) => request(`/Appointments/${id}`, asJson('PUT', data))
export const deleteAppointment = (id) => request(`/Appointments/${id}`, { method: 'DELETE' })
export const AppointmentStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'No-show']

// Services
export const getServices = () => request('/services')
export const createService = (data) => request('/services', asJson('POST', data))
export const updateService = (id, data) => request(`/services/${id}`, asJson('PUT', data))
export const deleteService = (id) => request(`/services/${id}`, { method: 'DELETE' })

// Treatments & Payments
export const getTreatments = () => request('/treatments')
export const getTreatment = (id) => request(`/treatments/${id}`)
export const createTreatment = (data) => request('/treatments', asJson('POST', data))
export const updateTreatment = (id, data) => request(`/treatments/${id}`, asJson('PUT', data))
export const addPayment = (treatmentId, data) => request(`/treatments/${treatmentId}/payments`, asJson('POST', data))
export const TreatmentStatuses = ['Planned', 'In progress', 'Completed', 'Cancelled']

// Users
export const getUsers = () => request('/users')
export const createUser = (data) => request('/users', asJson('POST', data))
export const updateUser = (id, data) => request(`/users/${id}`, asJson('PUT', data))
export const deactivateUser = (id) => request(`/users/${id}`, { method: 'DELETE' })

// Clinical record
export const getDentalRecord = (patientId) => request(`/patients/${patientId}/record`)
export const upsertDentalRecord = (patientId, data) => request(`/patients/${patientId}/record`, asJson('PUT', data))
export const addConsultation = (patientId, data) => request(`/patients/${patientId}/record/consultations`, asJson('POST', data))

// Dashboard
export const getDashboard = () => request('/dashboard')
