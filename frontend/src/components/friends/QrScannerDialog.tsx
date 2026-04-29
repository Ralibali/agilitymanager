import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (decodedText: string) => void;
}

export default function QrScannerDialog({ open, onOpenChange, onScan }: QrScannerDialogProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    const elementId = 'qr-reader';
    let mounted = true;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (mounted) onScan(decodedText);
          },
          () => {}
        );
      } catch (err) {
        if (mounted) setError('Kunde inte starta kameran. Kontrollera behörigheter.');
      }
    };

    // Small delay to let dialog render
    const timeout = setTimeout(startScanner, 300);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open, onScan]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Scanna QR-kod</DialogTitle></DialogHeader>
        <div id="qr-reader" className="w-full rounded-lg overflow-hidden" />
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
