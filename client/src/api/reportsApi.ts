import { Report } from "../generated-types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface CreateReportData {
  description: string;
  picture?: string;
  event_id?: number;
  spot_id?: number;
  score?: number;
}

interface UpdateReportData {
  description?: string;
  picture?: string;
}

// Get reports for an event or spot
export const getReports = async (
  eventId?: number,
  spotId?: number,
  isFlagged?: boolean
): Promise<Report[]> => {
  const params = new URLSearchParams();
  if (eventId) params.append("event_id", eventId.toString());
  if (spotId) params.append("spot_id", spotId.toString());
  if (isFlagged !== undefined) params.append("is_flagged", isFlagged.toString());

  const response = await fetch(`${API_URL}/api/reports/?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch reports");
  }
  const json = await response.json();
  return json.data as Report[];
};

// Create a new report
export const createReport = async (
  token: string,
  reportData: CreateReportData
): Promise<Report> => {
  const response = await fetch(`${API_URL}/api/reports/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(reportData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create report");
  }

  const json = await response.json();
  return json.data as Report;
};

// Update a report
export const updateReport = async (
  token: string,
  reportId: number,
  reportData: UpdateReportData
): Promise<Report> => {
  const response = await fetch(`${API_URL}/api/reports/${reportId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(reportData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update report");
  }

  const json = await response.json();
  return json.data as Report;
};

// Flag a report as inappropriate
export const flagReport = async (
  token: string,
  reportId: number,
  category: string, // <--- Added parameter
  reason: string    // <--- Added parameter
): Promise<void> => {
  const response = await fetch(`${API_URL}/api/reports/${reportId}/flag`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ category, reason }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to flag report");
  }
};

// Unflag a report (admin only)
export const unflagReport = async (
  token: string,
  reportId: number
): Promise<void> => {
  const response = await fetch(`${API_URL}/api/reports/${reportId}/flag`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to unflag report");
  }
};

// Delete a report (admin only)
export const deleteReport = async (
  token: string,
  reportId: number
): Promise<void> => {
  const response = await fetch(`${API_URL}/api/reports/${reportId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to delete report");
  }
};
