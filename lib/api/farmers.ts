import { delay, getState, mutate, NotFoundError } from "../db";
import { uid } from "../utils";
import { assertNoSettledSales } from "./guards";
import type { Certificate, Farmer, FarmerInput, FarmerSummary, ID } from "../types";

export function farmerFullName(f: Pick<Farmer, "firstName" | "lastName">) {
  return `${f.firstName} ${f.lastName}`.trim();
}

export function farmerLocation(f: Pick<Farmer, "village" | "province">) {
  return [f.village, f.province].filter(Boolean).join(", ") || "—";
}

function toSummary(farmer: Farmer): FarmerSummary {
  const db = getState();
  const plotIds = db.plots.filter((p) => p.farmerId === farmer.id).map((p) => p.id);
  const cycleIds = db.cropCycles.filter((c) => c.farmerId === farmer.id).map((c) => c.id);
  return {
    ...farmer,
    fullName: farmerFullName(farmer),
    plotCount: plotIds.length,
    // Orders holding at least one line item drawn from this farmer's cycles.
    orderCount: db.orders.filter((o) =>
      o.lineItems.some((i) => cycleIds.includes(i.cropCycleId)),
    ).length,
    certificateCount: db.certificates.filter((c) => c.farmerId === farmer.id).length,
    locationLabel: farmerLocation(farmer),
  };
}

export async function listFarmers(search = ""): Promise<FarmerSummary[]> {
  const q = search.trim().toLowerCase();
  const rows = getState()
    .farmers.map(toSummary)
    .filter((f) =>
      q
        ? f.fullName.toLowerCase().includes(q) ||
          f.locationLabel.toLowerCase().includes(q) ||
          f.primaryPhone.replace(/\s/g, "").includes(q.replace(/\s/g, ""))
        : true,
    )
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  return delay(rows);
}

export async function getFarmer(id: ID): Promise<FarmerSummary> {
  const farmer = getState().farmers.find((f) => f.id === id);
  if (!farmer) throw new NotFoundError("Farmer", id);
  return delay(toSummary(farmer));
}

export async function createFarmer(input: FarmerInput): Promise<Farmer> {
  const farmer: Farmer = {
    ...input,
    id: uid("farmer"),
    documents: {
      profilePhotoName: input.documents?.profilePhotoName ?? null,
      nationalIdName: input.documents?.nationalIdName ?? null,
    },
    createdAt: new Date().toISOString().slice(0, 10),
  };
  mutate((db) => db.farmers.push(farmer));
  return delay(farmer);
}

export async function updateFarmer(id: ID, input: FarmerInput): Promise<Farmer> {
  const updated = mutate((db) => {
    const index = db.farmers.findIndex((f) => f.id === id);
    if (index === -1) throw new NotFoundError("Farmer", id);
    const next: Farmer = {
      ...db.farmers[index],
      ...input,
      documents: { ...db.farmers[index].documents, ...input.documents },
      id,
    };
    db.farmers[index] = next;
    return next;
  });
  return delay(updated);
}

/** Removes the farmer and everything hanging off them. */
export async function deleteFarmer(id: ID): Promise<void> {
  assertNoSettledSales(
    getState()
      .cropCycles.filter((c) => c.farmerId === id)
      .map((c) => c.id),
    "this farmer",
  );
  mutate((db) => {
    const cycleIds = db.cropCycles.filter((c) => c.farmerId === id).map((c) => c.id);
    // Strip this farmer's allocations from pending orders, then drop orders left with nothing.
    db.orders.forEach((order) => {
      order.lineItems = order.lineItems.filter((i) => !cycleIds.includes(i.cropCycleId));
    });
    db.orders = db.orders.filter((o) => o.lineItems.length > 0);
    db.cropCycles = db.cropCycles.filter((c) => c.farmerId !== id);
    db.plots = db.plots.filter((p) => p.farmerId !== id);
    db.certificates = db.certificates.filter((c) => c.farmerId !== id);
    db.farmers = db.farmers.filter((f) => f.id !== id);
  });
  return delay(undefined);
}

export async function setFarmerDocument(
  id: ID,
  key: "profilePhotoName" | "nationalIdName",
  fileName: string | null,
): Promise<void> {
  mutate((db) => {
    const farmer = db.farmers.find((f) => f.id === id);
    if (!farmer) throw new NotFoundError("Farmer", id);
    farmer.documents[key] = fileName;
  });
  return delay(undefined);
}

/* ------------------------------------------------------------ Certificates */

export async function listCertificates(farmerId: ID): Promise<Certificate[]> {
  const rows = getState()
    .certificates.filter((c) => c.farmerId === farmerId)
    // Soonest expiry first; certificates that never expire go last.
    .sort((a, b) => (a.expiryDate ?? "9999").localeCompare(b.expiryDate ?? "9999"));
  return delay(rows);
}

export async function getCertificate(id: ID): Promise<Certificate> {
  const cert = getState().certificates.find((c) => c.id === id);
  if (!cert) throw new NotFoundError("Certificate", id);
  return delay(cert);
}

export async function createCertificate(input: Omit<Certificate, "id">): Promise<Certificate> {
  const cert: Certificate = { ...input, id: uid("cert") };
  mutate((db) => db.certificates.push(cert));
  return delay(cert);
}

export async function updateCertificate(
  id: ID,
  input: Omit<Certificate, "id">,
): Promise<Certificate> {
  const updated = mutate((db) => {
    const index = db.certificates.findIndex((c) => c.id === id);
    if (index === -1) throw new NotFoundError("Certificate", id);
    const next = { ...input, id };
    db.certificates[index] = next;
    return next;
  });
  return delay(updated);
}

export async function deleteCertificate(id: ID): Promise<void> {
  mutate((db) => {
    db.certificates = db.certificates.filter((c) => c.id !== id);
  });
  return delay(undefined);
}
