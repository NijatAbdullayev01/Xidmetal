'use client';

import { Ruler, Route, Store, Home, X } from 'lucide-react';
import type { ServiceSummary } from '@xidmetal/shared';
import {
  formatVehicleDimensions,
  formatCargoRouteScope,
  formatServiceVenue,
  ServiceVenue,
} from '@xidmetal/shared';
import { Modal } from '@/components/ui/modal';
import { ServiceImageGallery } from '@/components/services/service-image-gallery';

interface ServicePreviewDialogProps {
  service: ServiceSummary;
  open: boolean;
  onClose: () => void;
}

export function ServicePreviewDialog({
  service,
  open,
  onClose,
}: ServicePreviewDialogProps) {
  const images = service.images ?? [];
  const hasImages = images.length > 0;
  const hasDescription = Boolean(service.description);
  const vehicleDimensions = formatVehicleDimensions(
    service.vehicleLength,
    service.vehicleWidth,
    service.vehicleHeight,
  );
  const cargoRouteLabel = formatCargoRouteScope(service.cargoRouteScope);
  const venueLabel = formatServiceVenue(service.serviceVenue);
  const VenueIcon =
    service.serviceVenue === ServiceVenue.AT_SALON ? Store : Home;
  const hasCargoMeta = Boolean(vehicleDimensions || cargoRouteLabel);
  const hasVenueMeta = Boolean(venueLabel);
  const hasExtraMeta = hasCargoMeta || hasVenueMeta;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={service.title}
      description="Xidmətin şəkilləri və təsviri"
      panelClassName="max-w-lg sm:max-w-xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {service.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Bağla"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4">
        {hasImages ? <ServiceImageGallery images={images} /> : null}

        {hasVenueMeta ? (
          <section aria-labelledby="service-preview-venue">
            <h3 id="service-preview-venue" className="sr-only">
              Xidmət yeri
            </h3>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-brand-dark">
                <VenueIcon className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Xidmət yeri</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{venueLabel}</p>
              </div>
            </div>
          </section>
        ) : null}

        {hasCargoMeta ? (
          <section aria-labelledby="service-preview-cargo" className="space-y-2.5">
            <h3 id="service-preview-cargo" className="sr-only">
              Yükdaşıma məlumatları
            </h3>
            {cargoRouteLabel ? (
              <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-brand-dark">
                  <Route className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Daşıma marşrutu</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{cargoRouteLabel}</p>
                </div>
              </div>
            ) : null}
            {vehicleDimensions ? (
              <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-brand-dark">
                  <Ruler className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Maşın ölçüləri</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{vehicleDimensions}</p>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {hasDescription ? (
          <section aria-labelledby="service-preview-description">
            {hasImages || hasExtraMeta ? (
              <h3
                id="service-preview-description"
                className="text-sm font-semibold text-foreground"
              >
                Təsvir
              </h3>
            ) : (
              <h3 id="service-preview-description" className="sr-only">
                Təsvir
              </h3>
            )}
            <p
              className={
                hasImages || hasExtraMeta
                  ? 'mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground'
                  : 'whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground'
              }
            >
              {service.description}
            </p>
          </section>
        ) : null}

        {!hasImages && !hasDescription && !hasExtraMeta ? (
          <p className="text-sm text-muted-foreground">
            Bu xidmət üçün şəkil və ya təsvir yoxdur.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
