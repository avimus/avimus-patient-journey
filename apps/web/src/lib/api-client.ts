import type {
  PatientListResponse,
  PatientDetail,
  CreatePatient,
  JourneyDetail,
  JourneyListResponse,
  CreateJourney,
  JourneyStatusResponse,
  UpdateJourneyStatus,
  ProtocolListResponse,
  ProtocolDetail,
  CreateProtocol,
  CompleteStep,
  CompleteStepResponse,
  DashboardStats,
  ApiError,
} from '@avimus/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

class ApiClientError extends Error {
  constructor(
    public statusCode: number,
    public body: ApiError,
  ) {
    super(body.error)
  }
}

async function request<T>(
  path: string,
  options: RequestInit,
  accessToken: string,
): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  })

  const body = await res.json()

  if (!res.ok) {
    throw new ApiClientError(res.status, body as ApiError)
  }

  return body as T
}

// ── Patients ──

export function listPatients(
  accessToken: string,
  params?: { search?: string; page?: number; limit?: number },
) {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs}` : ''
  return request<PatientListResponse>(`/patients${query}`, { method: 'GET' }, accessToken)
}

export function getPatient(accessToken: string, id: string) {
  return request<PatientDetail>(`/patients/${id}`, { method: 'GET' }, accessToken)
}

export function createPatient(accessToken: string, data: CreatePatient) {
  return request<PatientDetail>(`/patients`, { method: 'POST', body: JSON.stringify(data) }, accessToken)
}

// ── Journeys ──

export function listJourneys(
  accessToken: string,
  params?: { patientId?: string; status?: string; page?: number; limit?: number },
) {
  const qs = new URLSearchParams()
  if (params?.patientId) qs.set('patientId', params.patientId)
  if (params?.status) qs.set('status', params.status)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString() ? `?${qs}` : ''
  return request<JourneyListResponse>(`/journeys${query}`, { method: 'GET' }, accessToken)
}

export function getJourney(accessToken: string, id: string) {
  return request<JourneyDetail>(`/journeys/${id}`, { method: 'GET' }, accessToken)
}

export function createJourney(accessToken: string, data: CreateJourney) {
  return request<JourneyDetail>(`/journeys`, { method: 'POST', body: JSON.stringify(data) }, accessToken)
}

export function updateJourneyStatus(accessToken: string, id: string, data: UpdateJourneyStatus) {
  return request<JourneyStatusResponse>(`/journeys/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }, accessToken)
}

// ── Protocols ──

export function listProtocols(accessToken: string) {
  return request<ProtocolListResponse>(`/protocols`, { method: 'GET' }, accessToken)
}

export function getProtocol(accessToken: string, id: string) {
  return request<ProtocolDetail>(`/protocols/${id}`, { method: 'GET' }, accessToken)
}

export function createProtocol(accessToken: string, data: CreateProtocol) {
  return request<ProtocolDetail>(`/protocols`, { method: 'POST', body: JSON.stringify(data) }, accessToken)
}

export function updateProtocol(accessToken: string, id: string, data: CreateProtocol) {
  return request<ProtocolDetail>(`/protocols/${id}`, { method: 'PUT', body: JSON.stringify(data) }, accessToken)
}

export function deleteProtocol(accessToken: string, id: string) {
  return request<{ id: string; isActive: boolean }>(`/protocols/${id}`, { method: 'DELETE' }, accessToken)
}

// ── Steps ──

export function completeStep(accessToken: string, id: string, data: CompleteStep) {
  return request<CompleteStepResponse>(`/steps/${id}/complete`, { method: 'PATCH', body: JSON.stringify(data) }, accessToken)
}

// ── Dashboard ──

export function getDashboardStats(accessToken: string) {
  return request<DashboardStats>(`/dashboard/stats`, { method: 'GET' }, accessToken)
}

export { ApiClientError }
