export type LeadSource = "contact" | "asgardian";

export interface LeadPayload {
  isim: string;
  telefon: string;
  mesaj?: string;
  kaynak: LeadSource;
  dil?: "en" | "tr";
}

interface LeadResponse {
  basari?: boolean;
  id?: number | string;
  hata?: string;
}

export class LeadSubmissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadSubmissionError";
  }
}

export async function submitLead(payload: LeadPayload): Promise<LeadResponse> {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as LeadResponse;

  if (!response.ok || !data.basari) {
    throw new LeadSubmissionError(
      data.hata || "Your inquiry could not be routed to the engineering team.",
    );
  }

  return data;
}
