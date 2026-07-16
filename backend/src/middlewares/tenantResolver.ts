import { Response, NextFunction } from "express";
import { db } from "../services/database.service.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { AuthenticatedRequest } from "../types/index.js";

export const tenantResolver = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Public routes that do not require tenant resolution
  if (req.path.startsWith("/api/v1/tenant/onboard") || req.path.startsWith("/api/v1/health") || req.path.startsWith("/api/v1/version")) {
    next();
    return;
  }

  let hospitalId = req.headers["x-tenant-id"] as string;

  // Extract from domain / subdomain
  if (!hospitalId) {
    const host = req.headers.host || "";
    // Examples: hospital1.techhanu.com -> subdomain hospital1
    // hospital.com -> custom domain hospital.com
    const hostParts = host.split(":");
    const domainName = hostParts[0].toLowerCase();

    // Query domain match first
    let hospital = await db.hospital.findFirst({
      where: { domain: domainName, deletedAt: null },
    });

    if (!hospital && domainName.includes(".")) {
      const parts = domainName.split(".");
      // If subdomain is present (e.g. sub.domain.com has 3 parts)
      if (parts.length >= 3) {
        const subdomain = parts[0];
        hospital = await db.hospital.findFirst({
          where: { slug: subdomain, deletedAt: null },
        });
      }
    }

    if (hospital) {
      hospitalId = hospital.id;
    }
  }

  // Fallback to first hospital if no hospital is matched to guarantee functional playground
  if (!hospitalId) {
    const firstHosp = await db.hospital.findFirst({ where: { deletedAt: null } });
    if (firstHosp) {
      hospitalId = firstHosp.id;
    }
  }

  if (!hospitalId) {
    ApiResponse.error(res, "Tenant could not be resolved. Please register your hospital first.", undefined, 400);
    return;
  }

  // Bind tenant context
  req.tenantId = hospitalId;

  // Security claim verification: if JWT is present, ensure the claim matches the resolved tenant ID
  if (req.user && req.user.hospitalId !== req.tenantId) {
    ApiResponse.error(res, "Access denied. Cross-tenant request forgery detected.", undefined, 403);
    return;
  }

  next();
};

export default tenantResolver;
