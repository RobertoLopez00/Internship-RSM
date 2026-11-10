import { authorizedFetch, SessionExpiredError } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5097/api'

const STATUS_MESSAGES = {
  400: 'The information provided is invalid. Please check the form and try again.',
  401: 'Your session has expired or you are not signed in.',
  403: "You don't have permission to do this.",
  404: 'The requested resource was not found.',
  409: 'This conflicts with existing data. Please refresh and try again.',
  422: 'The information provided is invalid. Please check the form and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
}

export class ApiError extends Error {
  constructor(message, { status, path, cause } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.path = path
    this.cause = cause
  }
}

// Prefers the backend's own error message (when present) over the generic fallback, so
// validation errors from the API reach the user verbatim while unexpected failures still get a
// friendly, translated message instead of a raw status code.
async function extractError(response, path) {
  let serverMessage = null
  try { serverMessage = (await response.json())?.message || null } catch { /* body not JSON or empty */ }
  const fallback = STATUS_MESSAGES[response.status] || (response.status >= 500 ? 'The server had a problem processing this request. Please try again shortly.' : `Something went wrong (${response.status}).`)
  const message = serverMessage || fallback
  console.error(`[api] ${response.status} ${path}`, serverMessage ? { serverMessage } : '(no server message)')
  return new ApiError(message, { status: response.status, path })
}

function networkError(path, cause) {
  console.error(`[api] network error on ${path}`, cause)
  return new ApiError("We couldn't reach the server. Check your connection and try again.", { path, cause })
}

// Two request helpers, one convention: both normalize network failures and non-2xx responses
// into ApiError, and both treat 204 (No Content) as "no body to parse" rather than an error.
// publicRequest is for unauthenticated endpoints (plain fetch); request is for everything behind
// login and delegates to authorizedFetch, which owns token attachment/refresh (see auth.js).
async function publicRequest(path, options = {}) {
  let response
  try { response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } }) }
  catch (cause) { throw networkError(path, cause) }
  if (!response.ok) throw await extractError(response, path)
  return response.status === 204 ? null : response.json()
}

async function request(path, options = {}) {
  let response
  try { response = await authorizedFetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } }) }
  catch (cause) {
    // SessionExpiredError already means "logged out, listener notified" — let it propagate as-is
    // instead of being re-wrapped as a generic network error.
    if (cause instanceof SessionExpiredError) throw cause
    throw networkError(path, cause)
  }
  if (!response.ok) throw await extractError(response, path)
  return response.status === 204 ? null : response.json()
}

const asJson = (method, body) => ({ method, body: JSON.stringify(body) })

// Below: one thin wrapper per REST endpoint, grouped by resource. Kept intentionally trivial —
// all the real behavior (auth, error normalization) lives in request()/publicRequest() above.

// Public
export const getDoctorsPublic = () => publicRequest('/Doctors')
export const getServicesPublic = () => publicRequest('/services')
export const registerPatient = (data) => publicRequest('/auth/register-patient', asJson('POST', data))
export const getAvailability = (doctorId, date) => publicRequest(`/Appointments/availability?doctorId=${doctorId}&date=${date}`)

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
export const getSpecialties = () => request('/specialties')

// Appointments
export const getAppointments = () => request('/Appointments')
export const getMyAppointments = () => request('/Appointments/mine')
export const createAppointment = (data) => request('/Appointments', asJson('POST', data))
export const updateAppointment = (id, data) => request(`/Appointments/${id}`, asJson('PUT', data))
export const deleteAppointment = (id) => request(`/Appointments/${id}`, { method: 'DELETE' })
// The API sends and accepts statuses by enum name ("NoShow"); these are only the labels shown to people.
export const AppointmentStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'NoShow']

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
export const TreatmentStatuses = ['Planned', 'InProgress', 'Completed', 'Cancelled']
// Closed list, checked by the API and the database.
export const PaymentMethods = ['Cash', 'CreditCard', 'DebitCard', 'BankTransfer', 'Insurance', 'Other']

const LABELS = { NoShow: 'No-show', InProgress: 'In progress', CreditCard: 'Credit card', DebitCard: 'Debit card', BankTransfer: 'Bank transfer' }
export const statusLabel = (value) => LABELS[value] || value
export const paymentMethodLabel = statusLabel

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
