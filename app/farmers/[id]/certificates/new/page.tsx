"use client";

import { useParams, useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { CertificateForm } from "@/components/farmers/certificate-form";
import { createCertificate } from "@/lib/api/farmers";

export default function NewCertificatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <>
      <ScreenHeader
        title="Add Certificate"
        subtitle="Add a new certificate for this farmer"
        backHref={`/farmers/${id}`}
      />
      <Content withFooter>
        <CertificateForm
          cancelHref={`/farmers/${id}`}
          onSubmit={async (values) => {
            await createCertificate({ ...values, farmerId: id });
            router.replace(`/farmers/${id}`);
          }}
        />
      </Content>
    </>
  );
}
