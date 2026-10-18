"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Award,
  ChevronRight,
  IdCard,
  ImagePlus,
  Map,
  Pencil,
  Phone,
  Plus,
  ShoppingCart,
  Sprout,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ScreenHeader, HeaderIconButton } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { Card, CardBody, SectionHeading } from "@/components/ui/card";
import { Badge, DataPoint, EmptyState, ErrorNotice, ListSkeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useQuery } from "@/lib/hooks/use-query";
import {
  deleteCertificate,
  deleteFarmer,
  getFarmer,
  listCertificates,
  setFarmerDocument,
} from "@/lib/api/farmers";
import { listPlots } from "@/lib/api/plots";
import { listCropCycles } from "@/lib/api/crop-cycles";
import { listOrdersForFarmer } from "@/lib/api/orders";
import {
  CROP_STATUS_LABEL,
  CROP_STATUS_TONE,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
} from "@/lib/derive";
import { formatCurrency, formatDate, formatHectares, formatKg } from "@/lib/format";
import { errorMessage } from "@/lib/utils";

const GENDER_LABEL: Record<string, string> = { male: "Male", female: "Female", other: "Other" };

export default function FarmerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: farmer, loading, error } = useQuery(() => getFarmer(id), [id]);
  const { data: plots } = useQuery(() => listPlots("", id), [id]);
  const { data: cycles } = useQuery(() => listCropCycles({ farmerId: id }), [id]);
  const { data: orders } = useQuery(() => listOrdersForFarmer(id), [id]);
  const { data: certificates } = useQuery(() => listCertificates(id), [id]);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [certToDelete, setCertToDelete] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (error) {
    return (
      <>
        <ScreenHeader title="Farmer not found" backHref="/farmers" />
        <Content>
          <EmptyState icon={X} title="This farmer no longer exists" />
        </Content>
      </>
    );
  }

  if (!farmer || loading) {
    return (
      <>
        <ScreenHeader title="Loading..." backHref="/farmers" />
        <Content>
          <ListSkeleton rows={3} />
        </Content>
      </>
    );
  }

  return (
    <>
      <ScreenHeader
        title={farmer.fullName}
        subtitle={farmer.locationLabel}
        backHref="/farmers"
        avatarName={farmer.fullName}
        action={
          <HeaderIconButton href={`/farmers/${farmer.id}/edit`} label="Edit farmer">
            <Pencil className="size-4" />
          </HeaderIconButton>
        }
      />

      <Content className="space-y-5">
        <ErrorNotice message={actionError} />

        <div>
          <SectionHeading title="Contact Information" />
          <Card>
            <CardBody className="space-y-3">
              <ContactRow label="Primary Phone" value={farmer.primaryPhone} />
              <ContactRow
                label="Secondary Phone"
                value={farmer.secondaryPhone || "Not provided"}
                muted={!farmer.secondaryPhone}
              />
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeading title="Personal Information" />
          <Card>
            <CardBody className="grid grid-cols-2 gap-4">
              <DataPoint label="Gender" value={farmer.gender ? GENDER_LABEL[farmer.gender] : "—"} />
              <DataPoint label="Date of Birth" value={formatDate(farmer.dateOfBirth)} />
              <DataPoint label="Education" value={farmer.educationLevel ?? "—"} />
              <DataPoint label="Village" value={farmer.village || "—"} />
              <DataPoint label="Commune" value={farmer.commune || "—"} />
              <DataPoint label="District" value={farmer.district || "—"} />
              <DataPoint label="Province" value={farmer.province || "—"} className="col-span-2" />
              {farmer.notes ? (
                <DataPoint label="Notes" value={farmer.notes} className="col-span-2" />
              ) : null}
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeading
            title={`Farm Plots (${plots?.length ?? 0})`}
            action={
              <Button asChild variant="subtle" size="sm">
                <Link href={`/plots/new?farmerId=${farmer.id}`}>
                  <Plus /> Add plot
                </Link>
              </Button>
            }
          />
          <Card>
            <CardBody className="space-y-2">
              {plots?.length ? (
                plots.map((plot) => (
                  <Link
                    key={plot.id}
                    href={`/plots/${plot.id}`}
                    className="flex items-center gap-3 rounded-xl border border-line/70 p-3 active:bg-canvas"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Map className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{plot.name}</p>
                      <p className="truncate text-xs text-muted">
                        {formatHectares(plot.areaHectares)} · {plot.landType}
                      </p>
                    </div>
                    <Badge tone="green" dot>
                      {plot.property === "own" ? "Own" : "Rent"}
                    </Badge>
                    <ChevronRight className="size-4 shrink-0 text-muted/70" />
                  </Link>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted">No plots recorded yet</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeading
            title={`Crop Cycles (${cycles?.length ?? 0})`}
            hint="Everything this farmer has planted"
            action={
              <Button asChild variant="subtle" size="sm">
                <Link href={`/crops/new?farmerId=${farmer.id}`}>
                  <Plus /> Add
                </Link>
              </Button>
            }
          />
          <Card>
            <CardBody className="space-y-2">
              {cycles?.length ? (
                cycles.map((cycle) => (
                  <Link
                    key={cycle.id}
                    href={`/crops/${cycle.id}`}
                    className="flex items-center gap-3 rounded-xl border border-line/70 p-3 active:bg-canvas"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Sprout className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{cycle.cropName}</p>
                      <p className="truncate text-xs text-muted">
                        {cycle.plotName} · Planted {formatDate(cycle.plantingDate)}
                      </p>
                    </div>
                    <Badge tone={CROP_STATUS_TONE[cycle.status]}>
                      {CROP_STATUS_LABEL[cycle.status]}
                    </Badge>
                    <ChevronRight className="size-4 shrink-0 text-muted/70" />
                  </Link>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted">No crop cycles recorded yet</p>
              )}
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeading
            title={`Purchase Orders (${orders?.length ?? 0})`}
            hint="Orders that include this farmer's produce"
          />
          <Card>
            <CardBody className="space-y-2">
              {orders?.length ? (
                orders.map((order) => {
                  // Only this farmer's share of a possibly multi-farmer order.
                  const own = order.lineItems.filter((i) => i.farmerId === farmer.id);
                  const ownKg = own.reduce((sum, i) => sum + i.quantityKg, 0);
                  const ownValue = own.reduce((sum, i) => sum + i.lineTotal, 0);
                  return (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="flex items-center gap-3 rounded-xl border border-line/70 p-3 active:bg-canvas"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <ShoppingCart className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-bold text-ink">{order.code}</p>
                          <Badge tone={ORDER_STATUS_TONE[order.status]} dot>
                            {ORDER_STATUS_LABEL[order.status]}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted">{order.buyer}</p>
                        <p className="truncate text-xs text-muted">
                          {formatKg(ownKg)} from this farmer · {formatCurrency(ownValue)}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted/70" />
                    </Link>
                  );
                })
              ) : (
                <p className="py-4 text-center text-sm text-muted">
                  No orders include this farmer's produce yet
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div>
          <SectionHeading title="Documents" hint="Upload identification and profile documents" />
          <div className="space-y-3">
            <DocumentUploader
              title="Profile photo"
              hint="Upload profile photo"
              fileName={farmer.documents.profilePhotoName}
              accept="image/*"
              icon={ImagePlus}
              onChange={(name) => setFarmerDocument(farmer.id, "profilePhotoName", name)}
            />
            <DocumentUploader
              title="National ID"
              hint="Upload NID document"
              fileName={farmer.documents.nationalIdName}
              accept="image/*,application/pdf"
              icon={IdCard}
              onChange={(name) => setFarmerDocument(farmer.id, "nationalIdName", name)}
            />
          </div>
        </div>

        <div>
          <SectionHeading
            title={`Certificates (${certificates?.length ?? 0})`}
            action={
              <Button asChild variant="subtle" size="sm">
                <Link href={`/farmers/${farmer.id}/certificates/new`}>
                  <Plus /> Add
                </Link>
              </Button>
            }
          />
          <Card>
            <CardBody className="space-y-2">
              {certificates?.length ? (
                certificates.map((cert) => {
                  const expired = cert.expiryDate ? cert.expiryDate < new Date().toISOString().slice(0, 10) : false;
                  return (
                    <div
                      key={cert.id}
                      className="flex items-start gap-3 rounded-xl border border-line/70 p-3"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <Award className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-ink">{cert.title}</p>
                          {expired ? <Badge tone="red">Expired</Badge> : null}
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          Issued {formatDate(cert.issuedDate)}
                          {cert.expiryDate ? ` · Expires ${formatDate(cert.expiryDate)}` : " · No expiry"}
                        </p>
                        {cert.notes ? (
                          <p className="mt-1 text-xs text-muted">{cert.notes}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Link
                          href={`/farmers/${farmer.id}/certificates/${cert.id}/edit`}
                          aria-label="Edit certificate"
                          className="rounded-lg p-2 text-muted hover:bg-canvas"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <button
                          type="button"
                          aria-label="Delete certificate"
                          onClick={() => setCertToDelete(cert.id)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-4 text-center text-sm text-muted">No certificates added yet</p>
              )}
            </CardBody>
          </Card>
        </div>

        <Button variant="danger" block onClick={() => setConfirmDelete(true)}>
          <Trash2 /> Delete farmer
        </Button>
      </Content>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${farmer.fullName}?`}
        description="Their plots and crop cycles are removed, and their produce is released from any pending order. A farmer whose produce is in a delivered or completed order can't be deleted. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          setActionError(null);
          try {
            await deleteFarmer(farmer.id);
            router.replace("/farmers");
          } catch (e) {
            setActionError(errorMessage(e));
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      />

      <ConfirmDialog
        open={certToDelete !== null}
        onOpenChange={(open) => !open && setCertToDelete(null)}
        title="Delete this certificate?"
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (certToDelete) await deleteCertificate(certToDelete);
          setCertToDelete(null);
        }}
      />
    </>
  );
}

function ContactRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Phone className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className={muted ? "text-[15px] text-muted" : "text-[15px] font-semibold text-ink"}>
          {value}
        </p>
      </div>
    </div>
  );
}

/**
 * Phase 1 keeps documents local: we record the chosen file name so the UI can
 * show an uploaded state. Real uploads land with the backend.
 */
function DocumentUploader({
  title,
  hint,
  fileName,
  accept,
  icon: Icon,
  onChange,
}: {
  title: string;
  hint: string;
  fileName: string | null;
  accept: string;
  icon: React.ComponentType<{ className?: string }>;
  onChange: (fileName: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-ink">{title}</p>
          <button
            type="button"
            aria-label={`Upload ${title}`}
            onClick={() => inputRef.current?.click()}
            className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onChange(file.name);
            e.target.value = "";
          }}
        />

        {fileName ? (
          <div className="flex items-center gap-3 rounded-xl border border-line/70 bg-canvas p-3">
            <Icon className="size-5 shrink-0 text-brand-600" />
            <p className="min-w-0 flex-1 truncate text-sm text-ink">{fileName}</p>
            <button
              type="button"
              aria-label={`Remove ${title}`}
              onClick={() => onChange(null)}
              className="rounded-lg p-1.5 text-muted hover:bg-white"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-line py-6 text-center"
          >
            <Upload className="mb-2 size-5 text-muted" />
            <span className="text-sm text-muted">{hint}</span>
            <span className="mt-0.5 text-xs text-muted/80">Click to browse files</span>
          </button>
        )}
      </CardBody>
    </Card>
  );
}
