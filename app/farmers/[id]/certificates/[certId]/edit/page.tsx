"use client";

import { useParams, useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/layout/screen-header";
import { Content } from "@/components/layout/app-shell";
import { ListSkeleton } from "@/components/ui/misc";
import { CertificateForm } from "@/components/farmers/certificate-form";
import { getCertificate, updateCertificate } from "@/lib/api/farmers";
import { useQuery } from "@/lib/hooks/use-query";

export default function EditCertificatePage() {
  const { id, certId } = useParams<{ id: string; certId: string }>();
  const router = useRouter();
  const { data: certificate } = useQuery(() => getCertificate(certId), [certId]);

  return (
    <>
      <ScreenHeader
        title="Edit Certificate"
        subtitle="Update this farmer's certificate"
        backHref={`/farmers/${id}`}
      />
      <Content withFooter>
        {certificate ? (
          <CertificateForm
            certificate={certificate}
            cancelHref={`/farmers/${id}`}
            onSubmit={async (values) => {
              await updateCertificate(certId, { ...values, farmerId: id });
              router.replace(`/farmers/${id}`);
            }}
          />
        ) : (
          <ListSkeleton rows={2} />
        )}
      </Content>
    </>
  );
}
