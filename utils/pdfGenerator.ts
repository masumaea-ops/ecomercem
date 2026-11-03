import html2pdf from 'html2pdf.js';

/**
 * Print a DOM element cleanly using the #print-root portal to eliminate modal and overflow clipping.
 */
export const printDocument = (element: HTMLElement, options?: { isReceipt?: boolean; title?: string }) => {
  if (!element) return;
  const printRoot = document.getElementById('print-root');

  if (printRoot) {
    printRoot.innerHTML = '';
    const clone = element.cloneNode(true) as HTMLElement;
    clone.classList.remove('hidden');
    clone.classList.remove('print-force-container');
    clone.querySelectorAll('.hidden').forEach((el) => el.classList.remove('hidden'));

    if (options?.isReceipt) {
      clone.classList.add('thermal-receipt');
      document.body.classList.add('printing-receipt');
    }

    printRoot.appendChild(clone);
    document.body.classList.add('has-print-portal');

    // Give browser layout engine and fonts a moment to compute
    setTimeout(() => {
      window.print();
      // Cleanup after dialog
      setTimeout(() => {
        printRoot.innerHTML = '';
        document.body.classList.remove('has-print-portal');
        document.body.classList.remove('printing-receipt');
      }, 500);
    }, 150);
  } else {
    // Fallback if #print-root element is not present
    if (options?.isReceipt) {
      document.body.classList.add('printing-receipt');
    }
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-receipt');
    }, 500);
  }
};

/**
 * Download a DOM element as a crisp, multi-page vector-accurate PDF.
 * Uses an off-screen staging container at exact 190mm A4 printable width to avoid
 * hidden container crashes, zero-dimension cutoffs, and horizontal margin clipping.
 */
export const downloadPDF = async (element: HTMLElement, filename: string = 'Document.pdf') => {
  if (!element) return;

  // Create an off-screen staging container at exact A4 printable width (190mm)
  const stage = document.createElement('div');
  stage.id = 'pdf-render-stage';
  stage.style.position = 'fixed';
  stage.style.left = '-9999px';
  stage.style.top = '0';
  stage.style.width = '190mm';
  stage.style.maxWidth = '190mm';
  stage.style.background = '#ffffff';
  stage.style.zIndex = '-9999';
  stage.style.overflow = 'visible';
  stage.style.visibility = 'visible';
  stage.style.display = 'block';

  // Deep clone the element to preserve on-screen state while preparing for print
  const clone = element.cloneNode(true) as HTMLElement;
  clone.classList.remove('hidden');
  clone.classList.remove('print-force-container');
  clone.classList.remove('shadow-lg');
  clone.classList.remove('shadow-2xl');
  clone.style.width = '100%';
  clone.style.maxWidth = '100%';
  clone.style.minHeight = 'auto';
  clone.style.height = 'auto';
  clone.style.margin = '0';
  clone.style.padding = '0';
  clone.style.boxShadow = 'none';
  clone.style.display = 'block';
  clone.style.visibility = 'visible';

  // Ensure any internal hidden print elements are visible
  clone.querySelectorAll('.hidden').forEach((el) => {
    el.classList.remove('hidden');
  });

  stage.appendChild(clone);
  document.body.appendChild(stage);

  try {
    // Wait for all images in the clone to complete loading
    const images = Array.from(clone.querySelectorAll('img'));
    if (images.length > 0) {
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 800);
          });
        })
      );
    }

    const safeFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;

    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: safeFilename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: {
        mode: ['css', 'legacy'],
        avoid: ['tr', '.print-break-avoid', '.no-break', 'thead', 'tfoot', '.totals-block', '.signature-block', '.header-block']
      }
    };

    await html2pdf().set(opt).from(clone).save();
  } catch (error) {
    console.error('PDF generation error:', error);
    // Fallback cleanly to printDocument
    printDocument(element);
  } finally {
    if (stage.parentNode) {
      stage.parentNode.removeChild(stage);
    }
  }
};



