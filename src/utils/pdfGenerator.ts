import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { PDFDocument, PDFPage } from 'react-native-pdf-lib';
import { getQuote, getQuoteItems, getContact, getInvoice, getInvoiceItems, getPaymentsByInvoice } from './database';

interface PDFGeneratorOptions {
  companyName?: string;
  companyLogoPath?: string;
  includeUnitPrice?: boolean;
  includeMarkup?: boolean;
}

export const generateQuotePDF = async (
  quoteId: string,
  options: PDFGeneratorOptions = {}
) => {
  try {
    const quote = getQuote(quoteId);
    const contact = getContact(quote.contactId);
    const items = getQuoteItems(quoteId);

    if (!quote || !contact) {
      throw new Error('Quote or contact not found');
    }

    const pdfPath = `${FileSystem.documentDirectory}Quote_${quote.quoteNumber}.pdf`;

    // Create PDF document
    const pdf = PDFDocument.create();
    const page = pdf.addPage([595, 842]); // A4 size

    let yPosition = 750;

    // Header with logo if available
    if (options.companyLogoPath) {
      try {
        page.drawImage(options.companyLogoPath, {
          x: 50,
          y: yPosition,
          width: 100,
          height: 100,
        });
      } catch (error) {
        console.warn('Could not add logo to PDF:', error);
      }
    }

    // Company name
    page.drawText(options.companyName || 'Job Estimator', {
      x: 50,
      y: yPosition,
      fontSize: 24,
      fontColor: '333333',
      maxWidth: 400,
    });

    yPosition -= 50;

    // Quote title and number
    page.drawText('QUOTE', {
      x: 400,
      y: yPosition,
      fontSize: 20,
      fontColor: '666666',
    });

    page.drawText(`Quote #: ${quote.quoteNumber}`, {
      x: 400,
      y: yPosition - 25,
      fontSize: 12,
      fontColor: '333333',
    });

    page.drawText(`Date: ${new Date(quote.date).toLocaleDateString()}`, {
      x: 400,
      y: yPosition - 45,
      fontSize: 12,
      fontColor: '333333',
    });

    if (quote.expirationDate) {
      page.drawText(`Expires: ${new Date(quote.expirationDate).toLocaleDateString()}`, {
        x: 400,
        y: yPosition - 65,
        fontSize: 12,
        fontColor: '333333',
      });
    }

    yPosition -= 100;

    // Customer information
    page.drawText('BILL TO:', {
      x: 50,
      y: yPosition,
      fontSize: 12,
      fontColor: '333333',
    });

    yPosition -= 20;

    page.drawText(contact.name, {
      x: 50,
      y: yPosition,
      fontSize: 12,
      fontColor: '333333',
    });

    yPosition -= 15;

    if (contact.address) {
      page.drawText(contact.address, {
        x: 50,
        y: yPosition,
        fontSize: 11,
        fontColor: '666666',
      });
      yPosition -= 15;
    }

    if (contact.city || contact.state || contact.zip) {
      const locationStr = [contact.city, contact.state, contact.zip].filter(Boolean).join(', ');
      page.drawText(locationStr, {
        x: 50,
        y: yPosition,
        fontSize: 11,
        fontColor: '666666',
      });
      yPosition -= 15;
    }

    if (contact.email) {
      page.drawText(contact.email, {
        x: 50,
        y: yPosition,
        fontSize: 11,
        fontColor: '666666',
      });
      yPosition -= 15;
    }

    if (contact.phone) {
      page.drawText(contact.phone, {
        x: 50,
        y: yPosition,
        fontSize: 11,
        fontColor: '666666',
      });
    }

    yPosition -= 40;

    // Job type and description
    if (quote.jobType) {
      page.drawText(`Job Type: ${quote.jobType}`, {
        x: 50,
        y: yPosition,
        fontSize: 11,
        fontColor: '333333',
      });
      yPosition -= 20;
    }

    if (quote.description) {
      page.drawText('Description:', {
        x: 50,
        y: yPosition,
        fontSize: 11,
        fontColor: '333333',
      });
      yPosition -= 15;

      const lines = quote.description.split('\n');
      for (const line of lines) {
        page.drawText(line, {
          x: 60,
          y: yPosition,
          fontSize: 10,
          fontColor: '666666',
          maxWidth: 450,
        });
        yPosition -= 15;
      }
    }

    yPosition -= 20;

    // Items table header
    const tableTop = yPosition;
    page.drawRect({
      x: 50,
      y: tableTop - 25,
      width: 495,
      height: 25,
      color: 'EEEEEE',
    });

    page.drawText('Description', {
      x: 60,
      y: tableTop - 20,
      fontSize: 11,
      fontColor: '333333',
    });

    if (options.includeUnitPrice !== false) {
      page.drawText('Qty', {
        x: 280,
        y: tableTop - 20,
        fontSize: 11,
        fontColor: '333333',
      });

      page.drawText('Unit', {
        x: 320,
        y: tableTop - 20,
        fontSize: 11,
        fontColor: '333333',
      });

      page.drawText('Unit Price', {
        x: 370,
        y: tableTop - 20,
        fontSize: 11,
        fontColor: '333333',
      });
    }

    page.drawText('Total', {
      x: 480,
      y: tableTop - 20,
      fontSize: 11,
      fontColor: '333333',
    });

    yPosition = tableTop - 35;

    // Items
    for (const item of items) {
      if (yPosition < 100) {
        // Add new page if running out of space
        break; // For now, simplified - in production you'd add new pages
      }

      page.drawText(item.description, {
        x: 60,
        y: yPosition,
        fontSize: 10,
        fontColor: '333333',
        maxWidth: 200,
      });

      if (options.includeUnitPrice !== false) {
        page.drawText(item.quantity.toString(), {
          x: 280,
          y: yPosition,
          fontSize: 10,
          fontColor: '333333',
        });

        page.drawText(item.unitType, {
          x: 320,
          y: yPosition,
          fontSize: 10,
          fontColor: '333333',
        });

        page.drawText(`$${item.unitCost.toFixed(2)}`, {
          x: 370,
          y: yPosition,
          fontSize: 10,
          fontColor: '333333',
        });
      }

      page.drawText(`$${item.totalPrice.toFixed(2)}`, {
        x: 480,
        y: yPosition,
        fontSize: 10,
        fontColor: '333333',
      });

      yPosition -= 20;
    }

    yPosition -= 20;

    // Totals section
    page.drawRect({
      x: 350,
      y: yPosition - 80,
      width: 195,
      height: 80,
      color: 'F5F5F5',
    });

    page.drawText('Subtotal:', {
      x: 360,
      y: yPosition - 20,
      fontSize: 11,
      fontColor: '333333',
    });

    page.drawText(`$${quote.subtotal.toFixed(2)}`, {
      x: 460,
      y: yPosition - 20,
      fontSize: 11,
      fontColor: '333333',
    });

    if (quote.discountPercentage > 0 || quote.discountAmount > 0) {
      page.drawText('Discount:', {
        x: 360,
        y: yPosition - 40,
        fontSize: 11,
        fontColor: '333333',
      });

      page.drawText(`-$${quote.discountAmount.toFixed(2)}`, {
        x: 460,
        y: yPosition - 40,
        fontSize: 11,
        fontColor: '333333',
      });

      yPosition -= 20;
    }

    if (quote.taxRate > 0) {
      const taxAmount = (quote.subtotal - quote.discountAmount) * (quote.taxRate / 100);
      page.drawText('Tax:', {
        x: 360,
        y: yPosition - 40,
        fontSize: 11,
        fontColor: '333333',
      });

      page.drawText(`$${taxAmount.toFixed(2)}`, {
        x: 460,
        y: yPosition - 40,
        fontSize: 11,
        fontColor: '333333',
      });
    }

    page.drawText('TOTAL:', {
      x: 360,
      y: yPosition - 60,
      fontSize: 13,
      fontColor: '000000',
    });

    page.drawText(`$${quote.total.toFixed(2)}`, {
      x: 460,
      y: yPosition - 60,
      fontSize: 13,
      fontColor: '000000',
    });

    yPosition -= 100;

    // Terms and conditions
    if (quote.terms || quote.inclusions || quote.exclusions || quote.scopeOfWork) {
      page.drawText('TERMS & CONDITIONS', {
        x: 50,
        y: yPosition,
        fontSize: 12,
        fontColor: '333333',
      });

      yPosition -= 20;

      if (quote.terms) {
        page.drawText(quote.terms, {
          x: 60,
          y: yPosition,
          fontSize: 10,
          fontColor: '666666',
          maxWidth: 480,
        });
        yPosition -= 40;
      }

      if (quote.scopeOfWork) {
        page.drawText('SCOPE OF WORK:', {
          x: 60,
          y: yPosition,
          fontSize: 10,
          fontColor: '333333',
        });
        yPosition -= 15;

        page.drawText(quote.scopeOfWork, {
          x: 70,
          y: yPosition,
          fontSize: 9,
          fontColor: '666666',
          maxWidth: 460,
        });
      }
    }

    // Save PDF
    const savedPath = await pdf.write(pdfPath);
    return savedPath;
  } catch (error) {
    console.error('Error generating quote PDF:', error);
    throw error;
  }
};

export const generateInvoicePDF = async (
  invoiceId: string,
  options: PDFGeneratorOptions = {}
) => {
  try {
    const invoice = getInvoice(invoiceId);
    const contact = getContact(invoice.contactId);
    const items = getInvoiceItems(invoiceId);
    const payments = getPaymentsByInvoice(invoiceId);

    if (!invoice || !contact) {
      throw new Error('Invoice or contact not found');
    }

    const pdfPath = `${FileSystem.documentDirectory}Invoice_${invoice.invoiceNumber}.pdf`;

    // Create PDF document
    const pdf = PDFDocument.create();
    const page = pdf.addPage([595, 842]); // A4 size

    let yPosition = 750;

    // Header with logo if available
    if (options.companyLogoPath) {
      try {
        page.drawImage(options.companyLogoPath, {
          x: 50,
          y: yPosition,
          width: 100,
          height: 100,
        });
      } catch (error) {
        console.warn('Could not add logo to PDF:', error);
      }
    }

    // Company name
    page.drawText(options.companyName || 'Job Estimator', {
      x: 50,
      y: yPosition,
      fontSize: 24,
      fontColor: '333333',
      maxWidth: 400,
    });

    yPosition -= 50;

    // Invoice title and number
    page.drawText('INVOICE', {
      x: 400,
      y: yPosition,
      fontSize: 20,
      fontColor: '666666',
    });

    page.drawText(`Invoice #: ${invoice.invoiceNumber}`, {
      x: 400,
      y: yPosition - 25,
      fontSize: 12,
      fontColor: '333333',
    });

    page.drawText(`Date: ${new Date(invoice.date).toLocaleDateString()}`, {
      x: 400,
      y: yPosition - 45,
      fontSize: 12,
      fontColor: '333333',
    });

    if (invoice.dueDate) {
      page.drawText(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, {
        x: 400,
        y: yPosition - 65,
        fontSize: 12,
        fontColor: '333333',
      });
    }

    yPosition -= 100;

    // Customer information
    page.drawText('BILL TO:', {
      x: 50,
      y: yPosition,
      fontSize: 12,
      fontColor: '333333',
    });

    yPosition -= 20;

    page.drawText(contact.name, {
      x: 50,
      y: yPosition,
      fontSize: 12,
      fontColor: '333333',
    });

    yPosition -= 15;

    if (contact.address) {
      page.drawText(contact.address, {
        x: 50,
        y: yPosition,
        fontSize: 11,
        fontColor: '666666',
      });
      yPosition -= 15;
    }

    if (contact.city || contact.state || contact.zip) {
      const locationStr = [contact.city, contact.state, contact.zip].filter(Boolean).join(', ');
      page.drawText(locationStr, {
        x: 50,
        y: yPosition,
        fontSize: 11,
        fontColor: '666666',
      });
      yPosition -= 15;
    }

    yPosition -= 30;

    // Items table header
    const tableTop = yPosition;
    page.drawRect({
      x: 50,
      y: tableTop - 25,
      width: 495,
      height: 25,
      color: 'EEEEEE',
    });

    page.drawText('Description', {
      x: 60,
      y: tableTop - 20,
      fontSize: 11,
      fontColor: '333333',
    });

    if (options.includeUnitPrice !== false) {
      page.drawText('Qty', {
        x: 280,
        y: tableTop - 20,
        fontSize: 11,
        fontColor: '333333',
      });

      page.drawText('Unit', {
        x: 320,
        y: tableTop - 20,
        fontSize: 11,
        fontColor: '333333',
      });

      page.drawText('Unit Price', {
        x: 370,
        y: tableTop - 20,
        fontSize: 11,
        fontColor: '333333',
      });
    }

    page.drawText('Total', {
      x: 480,
      y: tableTop - 20,
      fontSize: 11,
      fontColor: '333333',
    });

    yPosition = tableTop - 35;

    // Items
    for (const item of items) {
      if (yPosition < 100) {
        break;
      }

      page.drawText(item.description, {
        x: 60,
        y: yPosition,
        fontSize: 10,
        fontColor: '333333',
        maxWidth: 200,
      });

      if (options.includeUnitPrice !== false) {
        page.drawText(item.quantity.toString(), {
          x: 280,
          y: yPosition,
          fontSize: 10,
          fontColor: '333333',
        });

        page.drawText(item.unitType, {
          x: 320,
          y: yPosition,
          fontSize: 10,
          fontColor: '333333',
        });

        page.drawText(`$${item.unitCost.toFixed(2)}`, {
          x: 370,
          y: yPosition,
          fontSize: 10,
          fontColor: '333333',
        });
      }

      page.drawText(`$${item.totalPrice.toFixed(2)}`, {
        x: 480,
        y: yPosition,
        fontSize: 10,
        fontColor: '333333',
      });

      yPosition -= 20;
    }

    yPosition -= 20;

    // Totals section
    page.drawRect({
      x: 350,
      y: yPosition - 100,
      width: 195,
      height: 100,
      color: 'F5F5F5',
    });

    page.drawText('Subtotal:', {
      x: 360,
      y: yPosition - 20,
      fontSize: 11,
      fontColor: '333333',
    });

    page.drawText(`$${invoice.subtotal.toFixed(2)}`, {
      x: 460,
      y: yPosition - 20,
      fontSize: 11,
      fontColor: '333333',
    });

    if (invoice.discountPercentage > 0 || invoice.discountAmount > 0) {
      page.drawText('Discount:', {
        x: 360,
        y: yPosition - 40,
        fontSize: 11,
        fontColor: '333333',
      });

      page.drawText(`-$${invoice.discountAmount.toFixed(2)}`, {
        x: 460,
        y: yPosition - 40,
        fontSize: 11,
        fontColor: '333333',
      });

      yPosition -= 20;
    }

    if (invoice.taxRate > 0) {
      const taxAmount = (invoice.subtotal - invoice.discountAmount) * (invoice.taxRate / 100);
      page.drawText('Tax:', {
        x: 360,
        y: yPosition - 40,
        fontSize: 11,
        fontColor: '333333',
      });

      page.drawText(`$${taxAmount.toFixed(2)}`, {
        x: 460,
        y: yPosition - 40,
        fontSize: 11,
        fontColor: '333333',
      });
    }

    page.drawText('TOTAL:', {
      x: 360,
      y: yPosition - 60,
      fontSize: 13,
      fontColor: '000000',
    });

    page.drawText(`$${invoice.total.toFixed(2)}`, {
      x: 460,
      y: yPosition - 60,
      fontSize: 13,
      fontColor: '000000',
    });

    if (payments.length > 0) {
      const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      page.drawText(`Amount Paid: -$${amountPaid.toFixed(2)}`, {
        x: 360,
        y: yPosition - 80,
        fontSize: 11,
        fontColor: '333333',
      });

      const balance = invoice.total - amountPaid;
      page.drawText(`Balance Due: $${Math.max(0, balance).toFixed(2)}`, {
        x: 360,
        y: yPosition - 100,
        fontSize: 12,
        fontColor: invoice.status === 'paid' ? '008000' : '990000',
      });
    }

    yPosition -= 120;

    // Terms
    if (invoice.terms) {
      page.drawText('TERMS:', {
        x: 50,
        y: yPosition,
        fontSize: 11,
        fontColor: '333333',
      });

      yPosition -= 15;

      page.drawText(invoice.terms, {
        x: 60,
        y: yPosition,
        fontSize: 10,
        fontColor: '666666',
        maxWidth: 480,
      });
    }

    // Save PDF
    const savedPath = await pdf.write(pdfPath);
    return savedPath;
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw error;
  }
};

export const sharePDF = async (filePath: string) => {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath);
    }
  } catch (error) {
    console.error('Error sharing PDF:', error);
    throw error;
  }
};
