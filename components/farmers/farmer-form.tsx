"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Card, CardBody, SectionHeading } from "@/components/ui/card";
import { FieldGroup, Input, Textarea } from "@/components/ui/field";
import { Select, toOptions } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/components/layout/app-shell";
import {
  communesOf,
  districtsOf,
  PROVINCE_NAMES,
  villagesOf,
} from "@/lib/mock/locations";
import { EDUCATION_LEVELS, type Farmer, type FarmerInput, type Gender } from "@/lib/types";
import { haptic } from "@/lib/telegram";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

function emptyFarmer(): FarmerInput {
  return {
    firstName: "",
    lastName: "",
    gender: null,
    dateOfBirth: null,
    educationLevel: null,
    primaryPhone: "",
    secondaryPhone: "",
    province: "",
    district: "",
    commune: "",
    village: "",
    notes: "",
  };
}

export function FarmerForm({
  farmer,
  onSubmit,
  submitLabel = "Save Farmer",
  cancelHref,
}: {
  farmer?: Farmer;
  onSubmit: (input: FarmerInput) => Promise<void>;
  submitLabel?: string;
  cancelHref: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<FarmerInput>(() =>
    farmer
      ? {
          firstName: farmer.firstName,
          lastName: farmer.lastName,
          gender: farmer.gender,
          dateOfBirth: farmer.dateOfBirth,
          educationLevel: farmer.educationLevel,
          primaryPhone: farmer.primaryPhone,
          secondaryPhone: farmer.secondaryPhone,
          province: farmer.province,
          district: farmer.district,
          commune: farmer.commune,
          village: farmer.village,
          notes: farmer.notes,
        }
      : emptyFarmer(),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FarmerInput>(key: K, value: FarmerInput[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const districts = useMemo(() => districtsOf(values.province), [values.province]);
  const communes = useMemo(
    () => communesOf(values.province, values.district),
    [values.province, values.district],
  );
  const villages = useMemo(
    () => villagesOf(values.province, values.district, values.commune),
    [values.province, values.district, values.commune],
  );

  function validate() {
    const next: Record<string, string> = {};
    if (!values.firstName.trim()) next.firstName = "First name is required";
    if (!values.lastName.trim()) next.lastName = "Last name is required";
    if (!values.primaryPhone.trim()) next.primaryPhone = "Primary phone is required";
    if (!values.dateOfBirth) next.dateOfBirth = "Date of birth is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    haptic("medium");
    try {
      await onSubmit(values);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <SectionHeading title="Personal Information" />
      <Card className="mb-5">
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="First Name" required error={errors.firstName} htmlFor="firstName">
              <Input
                id="firstName"
                value={values.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="Sokha"
              />
            </FieldGroup>
            <FieldGroup label="Last Name" required error={errors.lastName} htmlFor="lastName">
              <Input
                id="lastName"
                value={values.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="Meas"
              />
            </FieldGroup>
          </div>

          <FieldGroup label="Gender" htmlFor="gender">
            <Select
              id="gender"
              value={values.gender}
              onValueChange={(v) => set("gender", v as Gender)}
              options={GENDER_OPTIONS}
            />
          </FieldGroup>

          <FieldGroup label="Date of Birth" required error={errors.dateOfBirth} htmlFor="dob">
            <Input
              id="dob"
              type="date"
              value={values.dateOfBirth ?? ""}
              onChange={(e) => set("dateOfBirth", e.target.value || null)}
            />
          </FieldGroup>

          <FieldGroup label="Education Level" htmlFor="education">
            <Select
              id="education"
              value={values.educationLevel}
              onValueChange={(v) => set("educationLevel", v as FarmerInput["educationLevel"])}
              options={toOptions(EDUCATION_LEVELS)}
            />
          </FieldGroup>
        </CardBody>
      </Card>

      <SectionHeading title="Contact Information" />
      <Card className="mb-5">
        <CardBody className="space-y-4">
          <FieldGroup
            label="Primary Phone"
            required
            error={errors.primaryPhone}
            htmlFor="primaryPhone"
          >
            <Input
              id="primaryPhone"
              type="tel"
              inputMode="tel"
              value={values.primaryPhone}
              onChange={(e) => set("primaryPhone", e.target.value)}
              placeholder="098 765 432"
            />
          </FieldGroup>
          <FieldGroup label="Secondary Phone" htmlFor="secondaryPhone">
            <Input
              id="secondaryPhone"
              type="tel"
              inputMode="tel"
              value={values.secondaryPhone}
              onChange={(e) => set("secondaryPhone", e.target.value)}
              placeholder="Optional"
            />
          </FieldGroup>
        </CardBody>
      </Card>

      <SectionHeading title="Location" hint="Province narrows the lists below it" />
      <Card className="mb-5">
        <CardBody className="space-y-4">
          <FieldGroup label="Province" htmlFor="province">
            <Select
              id="province"
              value={values.province}
              onValueChange={(v) =>
                setValues((prev) => ({ ...prev, province: v, district: "", commune: "", village: "" }))
              }
              options={toOptions(PROVINCE_NAMES)}
            />
          </FieldGroup>
          <FieldGroup label="District" htmlFor="district">
            <Select
              id="district"
              value={values.district}
              onValueChange={(v) =>
                setValues((prev) => ({ ...prev, district: v, commune: "", village: "" }))
              }
              options={toOptions(districts.map((d) => d.name))}
              disabled={!values.province}
              placeholder={values.province ? "Select" : "Select a province first"}
            />
          </FieldGroup>
          <FieldGroup label="Commune" htmlFor="commune">
            <Select
              id="commune"
              value={values.commune}
              onValueChange={(v) => setValues((prev) => ({ ...prev, commune: v, village: "" }))}
              options={toOptions(communes.map((c) => c.name))}
              disabled={!values.district}
              placeholder={values.district ? "Select" : "Select a district first"}
            />
          </FieldGroup>
          <FieldGroup label="Village" htmlFor="village">
            <Select
              id="village"
              value={values.village}
              onValueChange={(v) => set("village", v)}
              options={toOptions(villages)}
              disabled={!values.commune}
              placeholder={values.commune ? "Select" : "Select a commune first"}
            />
          </FieldGroup>
        </CardBody>
      </Card>

      <SectionHeading title="Additional Notes" />
      <Card>
        <CardBody>
          <Textarea
            value={values.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Add any additional notes..."
          />
        </CardBody>
      </Card>

      <StickyFooter>
        <Button type="button" variant="secondary" block onClick={() => router.push(cancelHref)}>
          Cancel
        </Button>
        <Button type="submit" block disabled={saving}>
          <Save /> {saving ? "Saving..." : submitLabel}
        </Button>
      </StickyFooter>
    </form>
  );
}
