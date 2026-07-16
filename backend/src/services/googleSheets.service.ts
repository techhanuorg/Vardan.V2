import { google } from "googleapis";
import env from "../config/env.js";
import logger from "../utils/logger.js";

export class GoogleSheetsService {
  private static getAuth() {
    const email = env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const privateKey = env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!email || !privateKey) {
      logger.warn("Google Sheets credentials are not configured in environment variables.");
      return null;
    }

    return new google.auth.JWT(email, undefined, privateKey, [
      "https://www.googleapis.com/auth/spreadsheets",
    ]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static async getSheetValues(spreadsheetId: string, range: string): Promise<any[][]> {
    const auth = this.getAuth();
    if (!auth) {
      throw new Error("Google Sheets auth credentials are missing or unconfigured.");
    }

    const sheets = google.sheets({ version: "v4", auth });
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      return response.data.values || [];
    } catch (error) {
      logger.error({ error, spreadsheetId, range }, "Failed to get values from Google Sheet");
      throw error;
    }
  }

  public static async updateSheetValues(
    spreadsheetId: string,
    range: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: any[][]
  ): Promise<void> {
    const auth = this.getAuth();
    if (!auth) {
      throw new Error("Google Sheets auth credentials are missing or unconfigured.");
    }

    const sheets = google.sheets({ version: "v4", auth });
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: "RAW",
        requestBody: {
          values,
        },
      });
      logger.info({ spreadsheetId, range }, "Google Sheet updated successfully.");
    } catch (error) {
      logger.error({ error, spreadsheetId, range }, "Failed to update values in Google Sheet");
      throw error;
    }
  }

  public static async appendSheetValues(
    spreadsheetId: string,
    range: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: any[][]
  ): Promise<void> {
    const auth = this.getAuth();
    if (!auth) {
      throw new Error("Google Sheets auth credentials are missing or unconfigured.");
    }

    const sheets = google.sheets({ version: "v4", auth });
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: "RAW",
        requestBody: {
          values,
        },
      });
      logger.info({ spreadsheetId, range }, "Google Sheet rows appended successfully.");
    } catch (error) {
      logger.error({ error, spreadsheetId, range }, "Failed to append values to Google Sheet");
      throw error;
    }
  }
}

export default GoogleSheetsService;
